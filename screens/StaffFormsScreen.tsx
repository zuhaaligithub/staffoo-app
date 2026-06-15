// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   SafeAreaView,
//   StatusBar,
//   ActivityIndicator,
//   Modal,
//   Platform,
//   Animated,
//   Dimensions,
//   Linking,
// } from 'react-native';
// import RNFS from 'react-native-fs';
// import {
//   ArrowLeft,
//   ChevronDown,
//   FileText,
//   Building2,
//   BadgeCheck,
//   Send,
//   X,
//   Check,
//   Download,
// } from 'lucide-react-native';
// import FileViewer from 'react-native-file-viewer';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Toast from 'react-native-toast-message';
// import { getUserProfile, uploadFile } from '../services/authApi';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import SignatureScreen from 'react-native-signature-canvas';
// import axios from 'axios';
// import { generatePDF as pdfConvert } from 'react-native-html-to-pdf';

// const BASE_URL = 'https://apis.staffoo.com.au';
// const GOOGLE_API_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';
// const BRAND = '#89E7D0'; // Mint accent
// const BRAND_DARK = '#111111'; // Deep Navy
// const BRAND_LIGHT = '#111111'; // Darker navy
// const ACCENT = '#0047FF'; // Bright blue
// const SUCCESS = '#89E7D0';
// const ERROR = '#EF4444';
// const GRAY_BG = '#001F3F';
// const CARD_BG = '#111111';

// type StaffTab = 'tfn' | 'super' | 'onboarding';

// const pdfStyles = `
//   <style>
//     *{box-sizing:border-box;margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;}
//     body{padding:0;background:#fff;color:#111;font-size:13px;}
//     .header{background:#0A7C6E;padding:16px 32px;}
//     .header-title{color:#fff;font-size:22px;font-weight:bold;}
//     .header-sub{color:#CBD5E1;font-size:11px;margin-top:2px;}
//     .body{padding:24px 32px;}
//     h2{font-size:16px;font-weight:bold;color:#111;margin-bottom:8px; border-bottom:1px solid #ddd;padding-bottom:6px;}
//     .section-title{font-size:10px;font-weight:700;color:#0284C7; text-transform:uppercase;letter-spacing:1px;margin-bottom:10px; border-bottom:1px solid #e2f4fb;padding-bottom:4px;margin-top:16px;}
//     .row{display:flex;gap:12px;margin-bottom:12px;}
//     .field{flex:1;}
//     .field label{display:block;font-size:9px;color:#666;margin-bottom:3px;}
//     .field .value{background:#f5f5f5;border:1px solid #ccc;border-radius:5px; padding:6px 8px;font-size:12px;min-height:28px;word-break:break-all;}
//     .checkbox-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;}
//     .cb{width:13px;height:13px;border:1px solid #999;border-radius:3px; display:inline-block;background:#fff;flex-shrink:0;}
//     .cb.on{background:#2EB1E2;border-color:#2EB1E2;}
//     .sig-box{border:1px solid #ccc;border-radius:6px;height:70px;background:#fafafa;}
//     .sig-img{height:65px;border:1px solid #ccc;border-radius:6px; background:#fafafa;max-width:280px;object-fit:contain;}
//     table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
//     th,td{border:1px solid #e2eef6;padding:7px 10px;text-align:left;}
//     th{background:#f1f7fc;font-size:10px;color:#64748b;font-weight:700;}
//     .footer{margin-top:32px;padding-top:10px;border-top:1px solid #ddd; font-size:9px;color:#888;text-align:center;}
//   </style>
// `;

// type FormUrls = {
//   tfn?: string;
//   super_form?: string;
//   onboarding?: string;
// };

// const StaffFormsScreen = ({ navigation }: any) => {
//   const [activeStaffTab, setActiveStaffTab] = useState<StaffTab>('onboarding');
//   const [userId, setUserId] = useState<number | string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [fetching, setFetching] = useState(true);
//   const tabAnim = useRef(new Animated.Value(0)).current;
//   const [tabLoading, setTabLoading] = useState(false);
//   // ── TFN Fields ──────────────────────────────────────────────────────────────
//   const [tfnNumber, setTfnNumber] = useState('');
//   const [tfnTitle, setTfnTitle] = useState('');
//   const [tfnFirstName, setTfnFirstName] = useState('');
//   const [tfnSurname, setTfnSurname] = useState('');
//   const [tfnPrevName, setTfnPrevName] = useState('');
//   const [tfnDob, setTfnDob] = useState('');
//   const [tfnDobBackend, setTfnDobBackend] = useState('');
//   const [tfnAddress, setTfnAddress] = useState('');
//   const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]); // ← Google suggestions
//   const [basisOfPayment, setBasisOfPayment] = useState<string | null>(null);
//   const [australianResident, setAustralianResident] = useState<string | null>(
//     null,
//   );
//   const [claimTaxFree, setClaimTaxFree] = useState<string | null>(null);
//   const [hasDebt, setHasDebt] = useState<string | null>(null);
//   const [signatureTfn, setSignatureTfn] = useState('');
//   const [dateTfn, setDateTfn] = useState('');
//   const [dateTfnBackend, setDateTfnBackend] = useState('');

//   // ── Super Fields ────────────────────────────────────────────────────────────
//   const [superFullName, setSuperFullName] = useState('');
//   const [superEmployeeNumber, setSuperEmployeeNumber] = useState('');
//   const [fundChoice, setFundChoice] = useState<'own' | 'employer'>('employer');
//   const [superFundName, setSuperFundName] = useState('');
//   const [superFundAbn, setSuperFundAbn] = useState('');
//   const [superFundUsi, setSuperFundUsi] = useState('');
//   const [superMemberNumber, setSuperMemberNumber] = useState('');
//   const [signatureSuper, setSignatureSuper] = useState('');
//   const [dateSuper, setDateSuper] = useState('');
//   const [dateSuperBackend, setDateSuperBackend] = useState('');

//   const [formUrls, setFormUrls] = useState<FormUrls>({});

//   // ── Onboarding Fields ───────────────────────────────────────────────────────
//   const [onboardTfn, setOnboardTfn] = useState('');
//   const [onboardSuperFundName, setOnboardSuperFundName] = useState('');
//   const [onboardSuperUsi, setOnboardSuperUsi] = useState('');
//   const [onboardMemberNumber, setOnboardMemberNumber] = useState('');
//   const [onboardFullName, setOnboardFullName] = useState('');
//   const [onboardMobile, setOnboardMobile] = useState('');
//   const [onboardEmail, setOnboardEmail] = useState('');
//   const [onboardAddress, setOnboardAddress] = useState('');

//   const [passportNumber, setPassportNumber] = useState('');
//   const [passportCountry, setPassportCountry] = useState('Australia');
//   const [passportExpiry, setPassportExpiry] = useState('');
//   const [workRights, setWorkRights] = useState<string | null>(null);
//   const [residentialStatus, setResidentialStatus] = useState<string | null>(
//     null,
//   ); // ← NEW
//   const GOOGLE_API_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';
//   const [idChecks, setIdChecks] = useState({
//     primary_id: false,
//     drivers_license: false,
//     security_license: false,
//     medicare_or_utility: false,
//   });
//   const [bankName, setBankName] = useState('');
//   // Google Places States
//   const [predictions, setPredictions] = useState<any[]>([]);

//   const [city, setCity] = useState('');
//   const [stateValue, setStateValue] = useState('');
//   const [country, setCountry] = useState('');
//   const [coordinates, setCoordinates] = useState<{
//     lat: number;
//     lng: number;
//   } | null>(null);
//   const [bsb, setBsb] = useState('');
//   const [accountNumber, setAccountNumber] = useState('');
//   const [securityLicence, setSecurityLicence] = useState('');
//   const [securityExpiry, setSecurityExpiry] = useState('');
//   const [firstAidNumber, setFirstAidNumber] = useState('');
//   const [firstAidExpiry, setFirstAidExpiry] = useState('');
//   const [signatureOnboard, setSignatureOnboard] = useState('');
//   const [dateOnboard, setDateOnboard] = useState('');
//   const [dateOnboardBackend, setDateOnboardBackend] = useState('');

//   // ── UI State ────────────────────────────────────────────────────────────────

//   const [showSuggestions, setShowSuggestions] = useState(false);
//   const [showTitleModal, setShowTitleModal] = useState(false);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [selectedDateField, setSelectedDateField] = useState<string | null>(
//     null,
//   );
//   const [showSignatureModal, setShowSignatureModal] = useState(false);
//   const [currentSignatureField, setCurrentSignatureField] = useState<
//     'tfn' | 'super' | 'onboard' | null
//   >(null);

//   const titleOptions = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr'];
//   const autoFullName = [tfnTitle, tfnFirstName, tfnSurname]
//     .filter(Boolean)
//     .join(' ');

//   // ── Init ────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const init = async () => {
//       try {
//         const storedUser = await AsyncStorage.getItem('user');
//         if (storedUser) {
//           const parsed = JSON.parse(storedUser);
//           setUserId(parsed.id);

//           const profileResponse = await getUserProfile(parsed.id);
//           const profile = profileResponse?.data || {};

//           if (profile.name) {
//             const fullName = profile.name.trim();
//             setTfnFirstName(fullName.split(' ')[0] || '');
//             setTfnSurname(fullName.split(' ').slice(1).join(' ') || '');
//             setSuperFullName(fullName);
//             setOnboardFullName(fullName);
//           }
//           if (profile.email) setOnboardEmail(profile.email);
//           if (profile.phone) setOnboardMobile(profile.phone);
//         }
//       } catch (_) { }
//       {
//         setFetching(false);
//       }
//     };
//     init();
//   }, []);

//   const switchTab = (tab: StaffTab) => {
//     setActiveStaffTab(tab);
//     Animated.spring(tabAnim, {
//       toValue: 1,
//       useNativeDriver: true,
//       tension: 100,
//       friction: 8,
//     }).start(() => tabAnim.setValue(0));
//   };

//   const openDatePicker = (field: string) => {
//     setSelectedDateField(field);
//     setShowDatePicker(true);
//   };

//   const fetchPlaces = async (text: string, isOnboarding = false) => {
//     if (text.length < 3) {
//       setPredictions([]);
//       setShowSuggestions(false);
//       return;
//     }

//     try {
//       const  = await fetch(
//         `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
//           text,
//         )}&key=${GOOGLE_API_KEY}&types=address`,
//       );
//       const json = await res.json();

//       if (json.status === 'OK') {
//         setPredictions(json.predictions || []);
//         setShowSuggestions(true);
//       } else {
//         setPredictions([]);
//         setShowSuggestions(false);
//       }
//     } catch (err) {
//       console.log('Places API error:', err);
//       setPredictions([]);
//       setShowSuggestions(false);
//     }
//   };

//   const fetchPlaceDetails = async (
//     placeId: string,
//     description: string,
//     isOnboarding = false,
//   ) => {
//     try {
//       setShowSuggestions(false);

//       requestAnimationFrame(async () => {
//         const res = await fetch(
//           `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`,
//         );
//         const json = await res.json();
//         const details = json.result;

//         if (isOnboarding) {
//           setOnboardAddress(description);
//         } else {
//           setTfnAddress(description);
//         }

//         // Optional: extract city, state, country
//         let tempCity = '',
//           tempState = '',
//           tempCountry = '';
//         details.address_components?.forEach((comp: any) => {
//           if (
//             comp.types.includes('locality') ||
//             comp.types.includes('sublocality')
//           )
//             tempCity = comp.long_name;
//           if (comp.types.includes('administrative_area_level_1'))
//             tempState = comp.long_name;
//           if (comp.types.includes('country')) tempCountry = comp.long_name;
//         });

//         setCity(tempCity);
//         setStateValue(tempState);
//         setCountry(tempCountry);
//       });
//     } catch (err) {
//       console.log('Place details error:', err);
//     }
//   };
//   const handleDateChange = (event: any, selectedDate?: Date) => {
//     setShowDatePicker(false);
//     if (!selectedDate || !selectedDateField) return;
//     const dd = ('0' + selectedDate.getDate()).slice(-2);
//     const mm = ('0' + (selectedDate.getMonth() + 1)).slice(-2);
//     const yyyy = selectedDate.getFullYear();
//     const display = `${dd}/${mm}/${yyyy}`;
//     const backend = selectedDate.toISOString().split('T')[0];
//     switch (selectedDateField) {
//       case 'tfnDob':
//         setTfnDob(display);
//         setTfnDobBackend(backend);
//         break;
//       case 'dateTfn':
//         setDateTfn(display);
//         setDateTfnBackend(backend);
//         break;
//       case 'dateSuper':
//         setDateSuper(display);
//         setDateSuperBackend(backend);
//         break;
//       case 'dateOnboard':
//         setDateOnboard(display);
//         setDateOnboardBackend(backend);
//         break;
//       case 'passportExp':
//         setPassportExpiry(display);
//         break;
//       case 'secExp':
//         setSecurityExpiry(display);
//         break;
//       case 'faExp':
//         setFirstAidExpiry(display);
//         break;
//     }
//   };

//   const openSignature = (f: 'tfn' | 'super' | 'onboard') => {
//     setCurrentSignatureField(f);
//     setShowSignatureModal(true);
//   };

//   useEffect(() => {
//     if (userId && activeStaffTab) {
//       resetAllFields(); // Clear old data
//       fetchFormData(userId); // Fetch fresh data
//     }
//   }, [activeStaffTab, userId]);

//   const getFormUrl = (tab: StaffTab | null): string | undefined => {
//     if (!tab) return undefined;
//     if (tab === 'super') return formUrls.super_form;
//     return formUrls[tab as keyof FormUrls];
//   };

//   const selectAddress = (description: string) => {
//     setTfnAddress(description);
//     setAddressSuggestions([]);
//     setShowSuggestions(false);
//   };

//   const fetchExistingForms = async (id: number | string) => {
//     try {
//       const token = await getToken();
//       if (!token) return;
//       const res = await axios.post(
//         `${BASE_URL}/api/form-data`,
//         { user_id: id, type: 'all' },
//         { headers: { Authorization: `Bearer ${token}` } },
//       );
//       const data = res.data?.data || {};
//       setFormUrls({
//         tfn: data.tfn_form ? `${BASE_URL}/storage/${data.tfn_form}` : undefined,
//         super_form: data.super_form
//           ? `${BASE_URL}/storage/${data.super_form}`
//           : undefined,
//         onboarding: data.onboarding_form
//           ? `${BASE_URL}/storage/${data.onboarding_form}`
//           : undefined,
//       });
//     } catch (e) {
//       console.log('Failed to fetch existing forms', e);
//     }
//   };

//   const handleSaveSignature = async (signature: string) => {
//     try {
//       if (!signature || signature.length < 100) {
//         Toast.show({ type: 'error', text1: 'Invalid signature' });
//         return;
//       }
//       setLoading(true);
//       const base64Data = signature.replace('data:image/png;base64,', '');
//       const filePath = `${RNFS.CachesDirectoryPath
//         }/signature_${Date.now()}.png`;
//       await RNFS.writeFile(filePath, base64Data, 'base64');
//       const file = {
//         uri: Platform.OS === 'ios' ? `file://${filePath}` : filePath,
//         type: 'image/png',
//         name: `signature_${Date.now()}.png`,
//       };
//       const uploadResponse = await uploadFile(file);
//       const uploadedSignature =
//         uploadResponse?.url || uploadResponse?.file || uploadResponse?.path;
//       if (!uploadedSignature) throw new Error('Signature upload failed');
//       if (currentSignatureField === 'tfn') setSignatureTfn(uploadedSignature);
//       if (currentSignatureField === 'super')
//         setSignatureSuper(uploadedSignature);
//       if (currentSignatureField === 'onboard')
//         setSignatureOnboard(uploadedSignature);
//       setShowSignatureModal(false);
//       Toast.show({
//         type: 'success',
//         text1: '✓ Signature uploaded successfully',
//       });
//     } catch (error: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Upload failed',
//         text2: error.message,
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getToken = async () =>
//     (await AsyncStorage.getItem('@auth_token')) ||
//     (await AsyncStorage.getItem('auth_token')) ||
//     (await AsyncStorage.getItem('@token'));

//   // ═══════════════════════════════════════════════════════════════════════════
//   // PDF GENERATORS
//   // ═══════════════════════════════════════════════════════════════════════════

//   const generateTfnPdf = async (data: Record<string, any>): Promise<string> => {
//     const formatDate = (dateStr?: string): string => {
//       if (!dateStr) return '__ / __ / 2026';
//       try {
//         const date = new Date(dateStr);
//         const dd = ('0' + date.getDate()).slice(-2);
//         const mm = ('0' + (date.getMonth() + 1)).slice(-2);
//         const yyyy = date.getFullYear();
//         return `${dd} / ${mm} / ${yyyy}`;
//       } catch {
//         return dateStr || '__ / __ / 2026';
//       }
//     };

//     const check = (value: any, expectedYes: boolean = true): string => {
//       if (value === undefined || value === null) return '☐';
//       const val = String(value).toLowerCase().trim();
//       if (expectedYes) {
//         return val === '1' || val === 'yes' || val === 'true' || val === 'on'
//           ? '☑'
//           : '☐';
//       } else {
//         return val === '0' || val === 'no' || val === 'false' || val === 'off'
//           ? '☑'
//           : '☐';
//       }
//     };

//     const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { margin: 0; size: A4; }
//   body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #222; background: #fff; -webkit-print-color-adjust: exact !important; }
//   .header { background-color: #06264d !important; color: #ffffff !important; text-align: center; padding: 22px 20px 18px; }
//   .header-title { font-size: 30px; font-weight: bold; }
//   .header-sub { font-size: 11px; }
//   .content { padding: 25px 30px; }
//   .title { color: #1d4ed8; font-size: 24px; font-weight: bold; margin-bottom: 8px; }
//   .title-line { height: 3px; background: #2563eb; margin-bottom: 20px; }
//   .form-box { border: 1px solid #d5d5d5; }
//   .section { border-bottom: 1px solid #ddd; padding: 14px 16px; }
//   .label { font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #333; }
//   .field { min-height: 20px; border-bottom: 1px solid #888; font-size: 13px; padding: 2px 0; }
//   .checkbox-line { font-size: 12px; margin: 6px 0; }
// </style>
// </head>
// <body>
// <div class="header">
//   <div class="header-title">STAFFOO</div>
//   <div class="header-sub">Capital Services Pty Ltd | ABN: 48 613 317 838</div>
// </div>
// <div class="content">
//   <div class="title">Tax File Number (TFN) Declaration</div>
//   <div class="title-line"></div>
//   <div class="form-box">
//     <div class="section">
//       <div class="label">1. Tax file number (TFN)</div>
//       <div class="field">${data.tfn || '—'}</div>
//     </div>
//     <div class="section">
//       <div class="label">2. Name</div>
//       <div style="display:flex; gap:15px;">
//         <div style="flex:0.6"><small>Title:</small><div class="field">${data.title || ''
//       }</div></div>
//         <div style="flex:1"><small>First Name:</small><div class="field">${data.first_name || ''
//       }</div></div>
//         <div style="flex:1"><small>Surname:</small><div class="field">${data.surname || ''
//       }</div></div>
//       </div>
//     </div>
//     <div class="section">
//       <div class="label">3. Previous name (if applicable)</div>
//       <div class="field">${data.previous_name || '—'}</div>
//     </div>
//     <div class="section">
//       <div class="label">4. Date of birth</div>
//       <div class="field">${data.dob || '—'}</div>
//     </div>
//     <div class="section">
//       <div class="label">5. Residential address</div>
//       <div class="field" style="min-height:45px;">${data.address || '—'}</div>
//     </div>
//     <div class="section">
//       <div class="label">6. Basis of payment</div>
//       <div class="checkbox-line">
//         ${check(
//         data.basis_of_payment === 'full-time',
//       )} Full-time &nbsp;&nbsp;&nbsp;
//         ${check(
//         data.basis_of_payment === 'part-time',
//       )} Part-time &nbsp;&nbsp;&nbsp;
//         ${check(data.basis_of_payment === 'casual')} Casual
//       </div>
//     </div>
//     <div class="section">
//       <div class="label">7. Are you an Australian resident for tax purposes?</div>
//       <div class="checkbox-line">
//         ${check(data.australian_resident)} Yes &nbsp;&nbsp;&nbsp;
//         ${check(data.australian_resident, false)} No
//       </div>
//     </div>
//     <div class="section">
//       <div class="label">8. Do you want to claim the tax-free threshold?</div>
//       <div class="checkbox-line">
//         ${check(data.claim_threshold)} Yes &nbsp;&nbsp;&nbsp;
//         ${check(data.claim_threshold, false)} No
//       </div>
//     </div>
//     <div class="section">
//       <div class="label">9. Do you have a HELP, VSL, FS, SSL or TSL debt?</div>
//       <div class="checkbox-line">
//         ${check(data.help_debt)} Yes &nbsp;&nbsp;&nbsp;
//         ${check(data.help_debt, false)} No
//       </div>
//     </div>
//   </div>
//   <div style="margin-top:50px;">
//     ${data.signature
//         ? `<img src="${data.signature}" style="max-height:90px; max-width:320px; object-fit:contain;" />`
//         : '<div style="border-bottom:2px solid #333; width:280px; height:70px;"></div>'
//       }
//     <div style="font-weight:bold; margin-top:8px;">Employee Signature</div>
//     <div>Date: ${formatDate(data.signed_date || data.date)}</div>
//   </div>
// </div>
// </body>
// </html>`;

//     const result = await pdfConvert({
//       html,
//       fileName: `TFN_Declaration_${Date.now()}`,
//       directory: 'Cache',
//       base64: false,
//       width: 595,
//       height: 842,
//     });
//     if (!result?.filePath) throw new Error('PDF generation failed');
//     return result.filePath;
//   };

//   const generateSuperPdf = async (
//     data: Record<string, any>,
//   ): Promise<string> => {
//     const formatDate = (dateStr?: string): string => {
//       if (!dateStr) return '__ / __ / 2026';
//       try {
//         const date = new Date(dateStr);
//         const dd = ('0' + date.getDate()).slice(-2);
//         const mm = ('0' + (date.getMonth() + 1)).slice(-2);
//         const yyyy = date.getFullYear();
//         return `${dd} / ${mm} / ${yyyy}`;
//       } catch {
//         return dateStr || '__ / __ / 2026';
//       }
//     };

//     const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { size: A4; margin: 0; }
//   html, body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; background: #fff; -webkit-print-color-adjust: exact !important; }
//   .header { background-color: #06264d !important; color: #ffffff !important; text-align: center; padding: 22px 20px 18px; }
//   body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #222; background: #fff; }
//   .page { width: 100%; padding: 0; }
//   .header-title { font-size: 30px; font-weight: bold; letter-spacing: 1px; margin-bottom: 5px; }
//   .header-sub { font-size: 11px; opacity: 0.95; }
//   .content { padding: 22px 28px 30px; }
//   .title { color: #2563eb; font-size: 17px; font-weight: bold; margin-bottom: 6px; }
//   .title-line { height: 2px; background: #3b82f6; margin-bottom: 12px; }
//   .form-box { border: 1px solid #d7d7d7; }
//   .section { border-bottom: 1px solid #dcdcdc; padding: 10px 12px; }
//   .label { font-size: 10px; font-weight: bold; margin-bottom: 5px; color: #222; }
//   .field { border-bottom: 1px solid #888; min-height: 16px; font-size: 11px; padding-bottom: 2px; word-wrap: break-word; }
//   .checkbox-line { font-size: 10px; margin-top: 4px; line-height: 1.7; }
//   .employer-box { border: 1px solid #dcdcdc; padding: 10px 12px; margin-top: 10px; }
//   .employer-title { font-size: 10px; font-weight: bold; margin-bottom: 6px; }
//   .small { font-size: 9px; line-height: 1.5; }
//   .signature-area { margin-top: 18px; }
//   .signature-line { width: 180px; height: 32px; border-bottom: 1px solid #666; position: relative; }
//   .signature-img { position: absolute; width: 100%; height: 100%; object-fit: contain; left: 0; top: 0; }
//   .signature-label { font-size: 9px; font-weight: bold; margin-top: 4px; }
//   .date { font-size: 9px; margin-top: 2px; }
// </style>
// </head>
// <body>
// <div class="page">
//   <div class="header">
//     <div class="header-title">STAFFOO</div>
//     <div class="header-sub">Capital Services Pty Ltd | ABN: 48 613 317 838</div>
//   </div>
//   <div class="content">
//     <div class="title">Superannuation Standard Choice Form</div>
//     <div class="title-line"></div>
//     <div class="form-box">
//       <div class="section">
//         <div class="label">Employee Details</div>
//         <div style="margin-bottom:10px;">
//           <div class="small">Name:</div>
//           <div class="field">${data.full_name || ''}</div>
//         </div>
//         <div>
//           <div class="small">Employee Number (if known):</div>
//           <div class="field">${data.employee_number || ''}</div>
//         </div>
//       </div>
//       <div class="section">
//         <div class="label">Choice of Fund</div>
//         <div class="checkbox-line">${data.fund_choice === 'own' ? '☑' : '☐'
//       } 1. I nominate my own individual fund:</div>
//         <div style="margin-top:8px;"><div class="small">Fund Name:</div><div class="field">${data.fund_name || ''
//       }</div></div>
//         <div style="margin-top:8px;"><div class="small">Fund ABN:</div><div class="field">${data.fund_abn || ''
//       }</div></div>
//         <div style="margin-top:8px;"><div class="small">Fund USI:</div><div class="field">${data.fund_usi || ''
//       }</div></div>
//         <div style="margin-top:8px;"><div class="small">Member Account Number:</div><div class="field">${data.member_account || ''
//       }</div></div>
//         <div class="checkbox-line" style="margin-top:16px;">${data.fund_choice === 'employer' ? '☑' : '☐'
//       } 2. Employer-nominated fund (default)</div>
//       </div>
//     </div>
//     <div class="employer-box">
//       <div class="employer-title">Employer Details (Pre-filled)</div>
//       <div class="small">Employer Name: Capital Services Pty Ltd</div>
//       <div class="small">ABN: 48 613 317 838</div>
//       <div class="small">Address: 21 Tigriswood Blvd, Truganina VIC 3029</div>
//     </div>
//     <div class="signature-area">
//       <div class="signature-line">${data.signature
//         ? `<img src="${data.signature}" class="signature-img" />`
//         : ''
//       }</div>
//       <div class="signature-label">Employee Signature</div>
//       <div class="date">Date: ${formatDate(data.signed_date || data.date)}</div>
//     </div>
//   </div>
// </div>
// </body>
// </html>`;

//     const result = await pdfConvert({
//       html,
//       fileName: `superannuation_${Date.now()}`,
//       directory: 'Cache',
//       base64: false,
//     });
//     if (!result.filePath) throw new Error('Super PDF generation failed');
//     return result.filePath;
//   };

//   const generateOnboardingPdf = async (
//     data: Record<string, any>,
//   ): Promise<string> => {
//     const idRows = [
//       {
//         label: 'Birth cert / Passport / Citizenship',
//         pts: 70,
//         key: 'primary_id',
//       },
//       {
//         label: "Driver's licence / Govt photo ID",
//         pts: 40,
//         key: 'drivers_license',
//       },
//       {
//         label: 'Security licence (mandatory)',
//         pts: 40,
//         key: 'security_license',
//       },
//       {
//         label: 'Medicare / Utility bill / Bank stmt',
//         pts: 25,
//         key: 'medicare_or_utility',
//       },
//     ];
//     const formatDate = (dateStr?: string): string => {
//       if (!dateStr) return '__ / __ / 2026';
//       try {
//         const date = new Date(dateStr);
//         const dd = ('0' + date.getDate()).slice(-2);
//         const mm = ('0' + (date.getMonth() + 1)).slice(-2);
//         const yyyy = date.getFullYear();
//         return `${dd} / ${mm} / ${yyyy}`;
//       } catch {
//         return dateStr || '__ / __ / 2026';
//       }
//     };

//     // Safely parse id checks structure since it's passed as a JSON object string or standard dictionary
//     let normalizedChecks: any = {};
//     if (typeof data.id_checks === 'string') {
//       try {
//         normalizedChecks = JSON.parse(data.id_checks);
//       } catch (_) { }
//     } else {
//       normalizedChecks = data.id_checks || {};
//     }

//     const html = `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="utf-8" />
// <style>
//   @page { size: A4; margin: 0; }
//   html, body { margin: 0; padding: 0; background: #fff; font-family: Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; }
//   body { margin: 0; padding: 0; color: #222; }
//   .header { background-color: #06264d !important; color: #ffffff !important; text-align: center; padding: 22px 20px 18px; display: flex; justify-content: space-between; align-items: center; }
//   .header-left { font-size: 24px; font-weight: bold; }
//   .header-right { text-align: right; font-size: 8px; line-height: 1.4; }
//   .content { padding: 10px 18px 14px; }
//   .title { text-align: center; color: #1d4ed8; font-size: 16px; font-weight: bold; margin-bottom: 8px; }
//   .notice { border: 1px dashed #2563eb; background: #eef4ff; color: #1e3a8a; font-size: 8px; text-align: center; padding: 5px; margin-bottom: 10px; font-weight: bold; }
//   .section-title { background: #f1f5ff; color: #1d4ed8; font-size: 10px; font-weight: bold; padding: 4px 6px; margin-top: 8px; border-left: 3px solid #2563eb; }
//   .row { display: flex; gap: 10px; margin-top: 4px; }
//   .field { flex: 1; }
//   .field-label { font-size: 8px; font-weight: bold; margin-bottom: 2px; color: #333; }
//   .field-input { border: 1px solid #d8d8d8; min-height: 16px; padding: 2px 4px; font-size: 9px; background: #fff; }
//   .checkbox-line { font-size: 8px; margin-top: 4px; line-height: 1.6; }
//   table { width: 100%; border-collapse: collapse; margin-top: 5px; }
//   th { background: #f3f4f6; font-size: 8px; padding: 4px; border: 1px solid #dcdcdc; text-align: left; }
//   td { border: 1px solid #e2e2e2; padding: 4px; font-size: 8px; }
//   .declaration { margin-top: 10px; border: 1px solid #f2c46d; background: #fff8ea; padding: 6px; font-size: 7px; line-height: 1.5; color: #444; }
//   .signature-row { display: flex; justify-content: space-between; margin-top: 10px; }
//   .signature-box { width: 220px; }
//   .signature-line { border-bottom: 1px solid #666; height: 28px; position: relative; }
//   .signature-img { position: absolute; width: 100%; height: 100%; object-fit: contain; }
//   .signature-label { font-size: 8px; font-weight: bold; margin-top: 3px; }
//   .date-box { width: 120px; }
//   .footer { margin-top: 10px; text-align: center; font-size: 7px; color: #888; }
// </style>
// </head>
// <body>
// <div class="page">
//   <div class="header">
//     <div class="header-left">STAFFOO</div>
//     <div class="header-right">Capital Services Pty Ltd<br/>ABN: 48 613 317 838<br/>21 Tigriswood Blvd, Truganina VIC 3029</div>
//   </div>
//   <div class="content">
//     <div class="title">EMPLOYEE ONBOARDING & ID VERIFICATION FORM</div>
//     <div class="notice">MANDATORY: ATTACH CLEAR COPIES OF ALL DOCUMENTS WITH THIS FORM.</div>

//     <div class="section-title">1. PERSONAL CONTACT DETAILS</div>
//    <div class="row">
//       <div class="field"><div class="field-label">Full Name:</div><div class="field-input">${data.full_name || ''
//       }</div></div>
//       <div class="field"><div class="field-label">Date of Birth:</div><div class="field-input">${data.dob || ''
//       }</div></div>
//     </div>

//     <div class="row">
//       <div class="field"><div class="field-label">Residential Address:</div><div class="field-input">${data.address || ''
//       }</div></div>
//     </div>
//     <div class="row">
//       <div class="field"><div class="field-label">Mobile Phone Number:</div><div class="field-input">${data.mobile || ''
//       }</div></div>
//       <div class="field"><div class="field-label">Personal Email Address:</div><div class="field-input">${data.email || ''
//       }</div></div>
//     </div>

//     <div class="section-title">2. PASSPORT & WORK RIGHTS</div>
//     <div class="row">
//       <div class="field"><div class="field-label">Passport Number:</div><div class="field-input">${data.passport_number || ''
//       }</div></div>
//       <div class="field"><div class="field-label">Country of Issue:</div><div class="field-input">${data.passport_country || ''
//       }</div></div>
//       <div class="field"><div class="field-label">Passport Expiry Date:</div><div class="field-input">${data.passport_expiry || ''
//       }</div></div>
//     </div>
//     <div class="checkbox-line">
//       Work Rights Status:
//       ${data.work_rights === 'citizen_pr' ? '[✓]' : '[ ]'
//       } Australian Citizen/PR &nbsp;&nbsp;
//       ${data.work_rights === 'student_visa' ? '[✓]' : '[ ]'
//       } Student Visa &nbsp;&nbsp;
//       ${data.work_rights === 'other_visa' ? '[✓]' : '[ ]'} Other Visa
//     </div>

//     <div class="section-title">3. 100-POINT IDENTIFICATION CHECK</div>
//     <table>
//       <tr><th>Document Type</th><th style="width:60px;">Points</th><th style="width:70px;">Tick Attached</th></tr>
//       ${idRows
//         .map(
//           r =>
//             `<tr><td>${r.label}</td><td>${r.pts
//             }</td><td style="text-align:center;">${normalizedChecks[r.key] ? '[✓]' : '[ ]'
//             }</td></tr>`,
//         )
//         .join('')}
//     </table>

//     <div class="section-title">4. BANKING, TAX & SUPERANNUATION</div>
//     <div class="row">
//       <div class="field"><div class="field-label">Bank Name:</div><div class="field-input">${data.bank_name || ''
//       }</div></div>
//       <div class="field"><div class="field-label">BSB Number:</div><div class="field-input">${data.bsb || ''
//       }</div></div>
//       <div class="field"><div class="field-label">Account Number:</div><div class="field-input">${data.account_number || ''
//       }</div></div>
//     </div>
// <div class="section-title">4. TAX & SUPERANNUATION</div>
// <div class="row">
//   <div class="field"><div class="field-label">Tax File Number:</div>
//     <div class="field-input">${data.tfn || ''}</div>
//   </div>
// </div>
// <div class="row">
//   <div class="field"><div class="field-label">Super Fund Name:</div>
//     <div class="field-input">${data.super_fund || ''}</div>
//   </div>
//   <div class="field"><div class="field-label">Super USI:</div>
//     <div class="field-input">${data.super_usi || ''}</div>
//   </div>
// </div>
// <div class="row">
//   <div class="field"><div class="field-label">Member Number:</div>
//     <div class="field-input">${data.super_member || ''}</div>
//   </div>
// </div>
//     <div class="section-title">5. LICENCES & CERTIFICATIONS</div>
//     <div class="row">
//       <div class="field"><div class="field-label">Security licence No:</div><div class="field-input">${data.security_license || ''
//       }</div></div>
//       <div class="field"><div class="field-label">Licence Expiry:</div><div class="field-input">${data.security_license_expiry || ''
//       }</div></div>
//     </div>
//     <div class="row">
//       <div class="field"><div class="field-label">First Aid Cert No:</div><div class="field-input">${data.first_aid_cert || ''
//       }</div>

//       </div>
//       <div class="field"><div class="field-label">First Aid Expiry:</div><div class="field-input">${data.first_aid_expiry || ''
//       }</div></div>
//     </div>

//     <div class="declaration">
//       I declare that the information provided here is true and authentic.
//     </div>
//     <div class="signature-row">
//       <div class="signature-box">
//         <div class="signature-line">${data.signature
//         ? `<img src="${data.signature}" class="signature-img" />`
//         : ''
//       }</div>
//         <div class="signature-label">Signature</div>
//       </div>
//       <div class="date-box">
//         <div style="height:28px; border-bottom:1px solid #666; font-size:10px; padding-top:14px;">${formatDate(
//         data.signed_date || data.date,
//       )}</div>
//         <div class="signature-label">Date</div>
//       </div>
//     </div>
//   </div>
// </div>
// </body>
// </html>`;

//     const result = await pdfConvert({
//       html,
//       fileName: `onboarding_${Date.now()}`,
//       directory: 'Cache',
//       base64: false,
//     });
//     if (!result.filePath) throw new Error('Onboarding PDF generation failed');
//     return result.filePath;
//   };

//   const generateUploadAndOpenPdf = async (
//     pdfType: 'tfn' | 'super_form' | 'onboarding',
//   ) => {
//     try {
//       setLoading(true);
//       const token = await getToken();
//       if (!token) throw new Error('Auth token not found');

//       const apiType = pdfType === 'super_form' ? 'superannuation' : pdfType;
//       const formRes = await axios.post(
//         `${BASE_URL}/api/form-data`,
//         { user_id: userId, type: apiType },
//         { headers: { Authorization: `Bearer ${token}` } },
//       );
//       const formData = formRes.data?.data || formRes.data || {};

//       let pdfFilePath = '';
//       if (pdfType === 'tfn') {
//         pdfFilePath = await generateTfnPdf(formData);
//       } else if (pdfType === 'super_form') {
//         pdfFilePath = await generateSuperPdf(formData);
//       } else {
//         pdfFilePath = await generateOnboardingPdf(formData);
//       }

//       const form = new FormData();
//       form.append('user_id', String(userId));
//       form.append('type', pdfType);
//       form.append('folder', 'forms');
//       form.append('file', {
//         uri: Platform.OS === 'ios' ? pdfFilePath : `file://${pdfFilePath}`,
//         type: 'application/pdf',
//         name: `${pdfType}_${Date.now()}.pdf`,
//       } as any);

//       const uploadRes = await axios.post(
//         `${BASE_URL}/api/upload-staff-file`,
//         form,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       const uploadedUrl = uploadRes.data?.url || uploadRes.data?.data?.url;
//       const finalUrl = uploadedUrl
//         ? uploadedUrl.startsWith('http')
//           ? uploadedUrl
//           : `${BASE_URL}/storage/${uploadedUrl}`
//         : Platform.OS === 'ios'
//           ? pdfFilePath
//           : `file://${pdfFilePath}`;

//       if (uploadedUrl) {
//         setFormUrls(prev => ({ ...prev, [pdfType]: finalUrl }));
//       }

//       openPdf(finalUrl);
//     } catch (error: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'PDF Flow Failed',
//         text2:
//           error?.response?.data?.message || error.message || 'Error occurred',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ═══════════════════════════════════════════════════════════════════════════
//   // SAVE / FETCH FLOWS
//   // ═══════════════════════════════════════════════════════════════════════════

//   const openPdf = async (url?: string) => {
//     if (!url) return;
//     try {
//       if (/^https?:\/\//.test(url)) {
//         await Linking.openURL(url);
//       } else {
//         const localUrl =
//           Platform.OS === 'android' && !url.startsWith('file://')
//             ? `file://${url}`
//             : url;
//         await FileViewer.open(localUrl);
//       }
//     } catch (e) {
//       Toast.show({ type: 'error', text1: 'Cannot open PDF' });
//     }
//   };

//   const fetchFormData = async (id: number | string) => {
//     if (!id) return;

//     setTabLoading(true); // ← Loader On

//     try {
//       const token = await getToken();
//       if (!token) return;

//       const types = ['tfn', 'superannuation', 'onboarding'];

//       for (const type of types) {
//         const res = await axios.get(`${BASE_URL}/api/form-data`, {
//           params: { user_id: id, type },
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const data = res.data?.data || res.data || {};

//         if (type === 'tfn' && data.tfn) {
//           setTfnNumber(data.tfn || '');
//           setTfnTitle(data.title || '');
//           setTfnFirstName(data.first_name || '');
//           setTfnSurname(data.surname || '');
//           setTfnPrevName(data.previous_name || '');
//           setTfnAddress(data.address || '');
//           setBasisOfPayment(data.basis_of_payment || null);
//           setAustralianResident(convertToYesNo(data.australian_resident));
//           setClaimTaxFree(convertToYesNo(data.claim_threshold));
//           setHasDebt(convertToYesNo(data.help_debt));
//           setSignatureTfn(data.signature || '');

//           if (data.dob) {
//             const d = new Date(data.dob);
//             setTfnDob(
//               `${('0' + d.getDate()).slice(-2)}/${(
//                 '0' +
//                 (d.getMonth() + 1)
//               ).slice(-2)}/${d.getFullYear()}`,
//             );
//             setTfnDobBackend(data.dob);
//           }

//           if (data.signed_date) {
//             const d = new Date(data.signed_date);
//             setDateTfn(
//               `${('0' + d.getDate()).slice(-2)}/${(
//                 '0' +
//                 (d.getMonth() + 1)
//               ).slice(-2)}/${d.getFullYear()}`,
//             );
//             setDateTfnBackend(data.signed_date);
//           }
//         }

//         if (type === 'superannuation' && data.full_name) {
//           setSuperFullName(data.full_name || '');
//           setSuperEmployeeNumber(data.employee_number || '');
//           setFundChoice(data.fund_choice || 'employer');
//           setSuperFundName(data.fund_name || '');
//           setSuperFundAbn(data.fund_abn || '');
//           setSuperFundUsi(data.fund_usi || '');
//           setSuperMemberNumber(data.member_account || '');
//           setSignatureSuper(data.signature || '');

//           if (data.signed_date) {
//             const d = new Date(data.signed_date);
//             setDateSuper(
//               `${('0' + d.getDate()).slice(-2)}/${(
//                 '0' +
//                 (d.getMonth() + 1)
//               ).slice(-2)}/${d.getFullYear()}`,
//             );
//             setDateSuperBackend(data.signed_date);
//           }
//         }

//         if (type === 'onboarding' && data.full_name) {
//           setOnboardFullName(data.full_name || '');
//           setOnboardMobile(data.mobile || '');
//           setOnboardEmail(data.email || '');
//           setPassportNumber(data.passport_number || '');
//           setPassportCountry(data.passport_country || 'Australia');
//           setPassportExpiry(data.passport_expiry || '');
//           setWorkRights(data.work_rights || null);
//           setBankName(data.bank_name || '');
//           setBsb(data.bsb || '');
//           setOnboardTfn(data.tfn || '');
//           setOnboardSuperFundName(data.super_fund || '');
//           setOnboardSuperUsi(data.super_usi || '');
//           setOnboardMemberNumber(data.super_member || '');
//           setAccountNumber(data.account_number || '');
//           setSecurityLicence(data.security_license || '');
//           setSecurityExpiry(data.security_license_expiry || '');
//           setFirstAidNumber(data.first_aid_cert || '');
//           setFirstAidExpiry(data.first_aid_expiry || '');
//           setSignatureOnboard(data.signature || '');
//           setOnboardAddress(data.address || '');

//           if (data.id_checks) {
//             setIdChecks({
//               primary_id: !!data.id_checks.primary_id,
//               drivers_license: !!data.id_checks.drivers_license,
//               security_license: !!data.id_checks.security_license,
//               medicare_or_utility: !!data.id_checks.medicare_or_utility,
//             });
//           }

//           if (data.signed_date) {
//             const d = new Date(data.signed_date);
//             setDateOnboard(
//               `${('0' + d.getDate()).slice(-2)}/${(
//                 '0' +
//                 (d.getMonth() + 1)
//               ).slice(-2)}/${d.getFullYear()}`,
//             );
//             setDateOnboardBackend(data.signed_date);
//           }
//         }

//         setFormUrls(prev => ({
//           ...prev,
//           [type === 'superannuation' ? 'super_form' : type]:
//             data.form_url || data.url || undefined,
//         }));
//       }
//     } catch (err) {
//       console.log('Failed to fetch form data:', err);
//     } finally {
//       setTabLoading(false); // ← Loader Off
//     }
//   };

//   // const convertToYesNo = (value: any): string | null => {
//   //   if (value === 1 || value === '1' || value === true) return 'yes';
//   //   if (value === 0 || value === '0' || value === false) return 'no';
//   //   return null;
//   // };

//   const convertToYesNo = (value: any): string | null => {
//     if (value === 1 || value === '1' || value === true || value === 'yes')
//       return 'yes';
//     if (value === 0 || value === '0' || value === false || value === 'no')
//       return 'no';
//     return null;
//   };

//   const yesNoToString = (value: string | null): string | null => {
//     if (value === 'yes') return 'yes';
//     if (value === 'no') return 'no';
//     return null;
//   };

//   const resetAllFields = () => {
//     setTfnNumber('');
//     setTfnTitle('');
//     setTfnFirstName('');
//     setTfnSurname('');
//     setTfnPrevName('');
//     setTfnDob('');
//     setTfnDobBackend('');
//     setTfnAddress('');
//     setBasisOfPayment(null);
//     setAustralianResident(null);
//     setClaimTaxFree(null);
//     setHasDebt(null);
//     setSignatureTfn('');
//     setOnboardTfn('');
//     setOnboardSuperFundName('');
//     setOnboardSuperUsi('');
//     setOnboardMemberNumber('');
//     setDateTfn('');
//     setDateTfnBackend('');
//     setSuperEmployeeNumber('');
//     setFundChoice('employer');
//     setSuperFundName('');
//     setSuperFundAbn('');
//     setSuperFundUsi('');
//     setSuperMemberNumber('');
//     setSignatureSuper('');
//     setDateSuper('');
//     setDateSuperBackend('');
//     setSuperFullName('');
//     setOnboardMobile('');
//     setOnboardEmail('');
//     setPassportNumber('');
//     setPassportCountry('Australia');
//     setPassportExpiry('');
//     setWorkRights(null);
//     setBankName('');
//     setBsb('');
//     setAccountNumber('');
//     setSecurityLicence('');
//     setSecurityExpiry('');
//     setFirstAidNumber('');
//     setFirstAidExpiry('');
//     setSignatureOnboard('');
//     setDateOnboard('');
//     setDateOnboardBackend('');
//     setOnboardFullName('');
//     setIdChecks({
//       primary_id: false,
//       drivers_license: false,
//       security_license: false,
//       medicare_or_utility: false,
//     });
//     setFormUrls({});
//   };

//   const handleSave = async () => {
//     if (!userId || !activeStaffTab) return;
//     setLoading(true);
//     try {
//       const token = await getToken();
//       const headers = { Authorization: `Bearer ${token}` };

//       if (activeStaffTab === 'tfn') {
//         await axios.post(
//           `${BASE_URL}/api/tfn-declaration`,
//           {
//             user_id: userId,
//             tfn: tfnNumber,
//             title: tfnTitle,
//             first_name: tfnFirstName,
//             surname: tfnSurname,
//             previous_name: tfnPrevName,
//             dob: tfnDobBackend,
//             address: tfnAddress,
//             basis_of_payment: basisOfPayment,
//             australian_resident: yesNoToString(australianResident),
//             claim_threshold: yesNoToString(claimTaxFree),
//             help_debt: yesNoToString(hasDebt),
//             signature: signatureTfn,
//             date: dateTfnBackend,
//           },
//           { headers },
//         );
//         Toast.show({ type: 'success', text1: '✓ TFN saved!' });
//         await generateUploadAndOpenPdf('tfn');
//       } else if (activeStaffTab === 'super') {
//         await axios.post(
//           `${BASE_URL}/api/superannuation`,
//           {
//             user_id: userId,
//             full_name: superFullName || autoFullName,
//             employee_number: superEmployeeNumber,
//             fund_choice: fundChoice,
//             fund_name: fundChoice === 'own' ? superFundName : '',
//             fund_abn: fundChoice === 'own' ? superFundAbn : '',
//             fund_usi: fundChoice === 'own' ? superFundUsi : '',
//             member_account: fundChoice === 'own' ? superMemberNumber : '',
//             signature: signatureSuper,
//             date: dateSuperBackend,
//           },
//           { headers },
//         );
//         Toast.show({ type: 'success', text1: '✓ Superannuation saved!' });
//         await generateUploadAndOpenPdf('super_form');
//       } else if (activeStaffTab === 'onboarding') {
//         const onboardingPayload = {
//           user_id: userId,
//           full_name: onboardFullName || autoFullName,
//           dob: tfnDobBackend,
//           residential_status: residentialStatus,
//           address: onboardAddress,
//           mobile: onboardMobile,
//           email: onboardEmail,
//           passport_number: passportNumber,
//           passport_country: passportCountry,
//           passport_expiry: passportExpiry,
//           work_rights: workRights,

//           tfn: onboardTfn, // ← NEW
//           super_fund: onboardSuperFundName, // ← NEW
//           super_usi: onboardSuperUsi, // ← NEW
//           super_member: onboardMemberNumber,

//           // 1. Pass the id_checks object structure intact
//           id_checks: {
//             primary_id: idChecks.primary_id,
//             drivers_license: idChecks.drivers_license,
//             security_license: idChecks.security_license,
//             medicare_or_utility: idChecks.medicare_or_utility,
//           },

//           // 2. Flattened validation flags (Renamed or checked parameters)
//           primary_id: idChecks.primary_id,
//           drivers_license: idChecks.drivers_license,
//           medicare_or_utility: idChecks.medicare_or_utility,
//           // Note: Removed the root level boolean "security_license: true"
//           // to prevent overwriting your actual licence string below.

//           bank_name: bankName,
//           bsb: bsb,
//           account_number: accountNumber,

//           // 3. LICENCE TEXT STRING FIELDS (Mapped to correct API keys)
//           security_license: securityLicence, // <--- Correct parameter name sending the String payload "Ggyuguy"
//           security_license_expiry: securityExpiry, // <--- Matches your target database sample schema
//           first_aid_cert: firstAidNumber, // <--- Aligns with target schema key "first_aid_cert"
//           first_aid_expiry: firstAidExpiry,

//           signature: signatureOnboard,
//           date: dateOnboardBackend,
//         };

//         await axios.post(`${BASE_URL}/api/onboarding`, onboardingPayload, {
//           headers,
//         });
//         Toast.show({ type: 'success', text1: '✓ Onboarding saved!' });
//         await generateUploadAndOpenPdf('onboarding');
//       }
//       await fetchFormData(userId);
//     } catch (err: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Save failed',
//         text2: err?.response?.data?.message || 'Please try again',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isFormComplete = (tab: StaffTab): boolean => {
//     if (tab === 'tfn') {
//       return !!(
//         tfnNumber &&
//         tfnTitle &&
//         tfnFirstName &&
//         tfnSurname &&
//         tfnDobBackend &&
//         tfnAddress &&
//         basisOfPayment &&
//         australianResident &&
//         claimTaxFree !== null &&
//         hasDebt !== null &&
//         signatureTfn
//       );
//     }
//     if (tab === 'super') {
//       return !!(
//         (superFullName || autoFullName) &&
//         signatureSuper &&
//         (fundChoice === 'employer' ||
//           (fundChoice === 'own' && superFundName && superFundUsi))
//       );
//     }
//     if (tab === 'onboarding') {
//       return !!(
//         (onboardFullName || autoFullName) &&
//         tfnDobBackend &&
//         tfnAddress &&
//         onboardMobile &&
//         onboardEmail &&
//         onboardAddress &&
//         passportNumber &&
//         passportExpiry &&
//         workRights &&
//         signatureOnboard &&
//         bankName &&
//         bsb &&
//         accountNumber
//       );
//     }
//     return false;
//   };

//   // ═══════════════════════════════════════════════════════════════════════════
//   // RENDER INTERFACE (Sub-components & UI Layout)
//   // ═══════════════════════════════════════════════════════════════════════════
//   if (fetching) {
//     return (
//       <SafeAreaView style={s.container}>
//         <View style={s.loadingWrap}>
//           <ActivityIndicator size="large" color={BRAND} />
//           <Text style={s.loadingText}>Loading your profile…</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   // Old tabs array ko replace kar do
//   const tabs: { key: StaffTab; label: string; Icon: any }[] = [
//     { key: 'onboarding', label: 'Employee Onboarding', Icon: BadgeCheck },
//     { key: 'tfn', label: 'TFN Declaration', Icon: FileText },
//     { key: 'super', label: 'Superannuation', Icon: Building2 },
//   ];

//   return (
//     <SafeAreaView style={s.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#f8faff" />

//       {/* Header */}
//       <View style={s.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
//           <ArrowLeft size={20} color="#fff" />
//         </TouchableOpacity>
//         <Text style={s.headerTitle}>Staff Forms</Text>
//         <View style={{ width: 40 }} />
//       </View>

//       {/* Tabs */}
//       {/* ── Tab Bar ── */}
//       <View style={s.tabBar}>
//         {[
//           { key: 'onboarding', label: 'Employee Onboarding', Icon: BadgeCheck },
//           { key: 'tfn', label: 'TFN Declaration', Icon: FileText },
//           { key: 'super', label: 'Superannuation', Icon: Building2 },
//         ].map(tab => {
//           const active = activeStaffTab === tab.key;
//           return (
//             <TouchableOpacity
//               key={tab.key}
//               style={[s.tabBtn, active && s.tabBtnActive]}
//               onPress={() => setActiveStaffTab(tab.key as StaffTab)}
//             >
//               <tab.Icon size={18} color={active ? '#fff' : '#94A3B8'} />
//               <Text style={[s.tabLabel, active && s.tabLabelActive]}>
//                 {tab.label}
//               </Text>
//             </TouchableOpacity>
//           );
//         })}
//       </View>

//       <ScrollView contentContainerStyle={s.scrollContent}>
//         {/* TFN TAB VIEW */}
//         {activeStaffTab === 'tfn' && (
//           <View style={s.card}>
//             <SectionLabel>Tax File Number</SectionLabel>
//             <Field label="TFN">
//               <StyledInput
//                 value={tfnNumber}
//                 onChangeText={setTfnNumber}
//                 placeholder="000 000 000"
//                 keyboardType="numeric"
//                 maxLength={11}
//               />
//             </Field>

//             <SectionLabel>Personal Details</SectionLabel>
//             <View style={s.row3}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Title">
//                   <TouchableOpacity
//                     style={s.selectBtn}
//                     onPress={() => setShowTitleModal(true)}
//                   >
//                     <Text
//                       style={[s.selectText, !tfnTitle && { color: '#9CA3AF' }]}
//                     >
//                       {tfnTitle || 'Mr/Ms'}
//                     </Text>
//                     <ChevronDown size={14} color="#94a3b8" />
//                   </TouchableOpacity>
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="First name">
//                   <StyledInput
//                     value={tfnFirstName}
//                     onChangeText={setTfnFirstName}
//                     placeholder="Jane"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Surname">
//                   <StyledInput
//                     value={tfnSurname}
//                     onChangeText={setTfnSurname}
//                     placeholder="Smith"
//                   />
//                 </Field>
//               </View>
//             </View>

//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Previous name (if any)">
//                   <StyledInput
//                     value={tfnPrevName}
//                     onChangeText={setTfnPrevName}
//                     placeholder="—"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Date of birth">
//                   <DateButton
//                     value={tfnDob}
//                     placeholder="dd/mm/yyyy"
//                     onPress={() => openDatePicker('tfnDob')}
//                   />
//                 </Field>
//               </View>
//             </View>

//             <SectionLabel>Residential Address</SectionLabel>
//             <Field label="Street address, suburb, state, postcode">
//               <StyledInput
//                 value={tfnAddress}
//                 onChangeText={(text: string) => {
//                   setTfnAddress(text);
//                   fetchPlaces(text);
//                 }}
//                 placeholder="Start typing your address..."
//               />
//             </Field>

//             {/* Suggestions Dropdown */}
//             {showSuggestions && predictions.length > 0 && (
//               <View style={s.suggestionsContainer}>
//                 {predictions.slice(0, 6).map((item, index) => (
//                   <TouchableOpacity
//                     key={index}
//                     style={s.suggestionItem}
//                     onPress={() =>
//                       fetchPlaceDetails(item.place_id, item.description)
//                     }
//                   >
//                     <Text style={s.suggestionText}>{item.description}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}

//             <SectionLabel>Employment</SectionLabel>
//             <Field label="Basis of payment">
//               <RadioGroup
//                 options={[
//                   { label: 'Full-time', value: 'full-time' },
//                   { label: 'Part-time', value: 'part-time' },
//                   { label: 'Casual', value: 'casual' },
//                 ]}
//                 value={basisOfPayment}
//                 onChange={setBasisOfPayment}
//               />
//             </Field>

//             <SectionLabel>Declarations</SectionLabel>
//             <Field label="Australian resident for tax?">
//               <YesNoGroup
//                 value={australianResident}
//                 onChange={setAustralianResident}
//               />
//             </Field>
//             <Field label="Claim tax-free threshold?">
//               <YesNoGroup value={claimTaxFree} onChange={setClaimTaxFree} />
//             </Field>
//             <Field label="Have HELP / VSL / trade debt?">
//               <YesNoGroup value={hasDebt} onChange={setHasDebt} />
//             </Field>

//             <SectionLabel>Signature & Date</SectionLabel>
//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Signature">
//                   <SignatureButton
//                     value={signatureTfn}
//                     onPress={() => openSignature('tfn')}
//                     onClear={() => setSignatureTfn('')}
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Date">
//                   <DateButton
//                     value={dateTfn}
//                     placeholder="dd/mm/yyyy"
//                     onPress={() => openDatePicker('dateTfn')}
//                   />
//                 </Field>
//               </View>
//             </View>

//             {/* {getFormUrl('tfn') && (
//               <TouchableOpacity
//                 style={s.downloadBtn}
//                 onPress={() => openPdf(getFormUrl('tfn'))}
//               >
//                 <Download size={18} color="#001F3F" />
//                 <Text style={s.downloadBtnText}>View Saved TFN PDF</Text>
//               </TouchableOpacity>
//             )} */}
//             <SaveButton
//               label="Save TFN Form"
//               loading={loading}
//               onPress={handleSave}
//             />
//           </View>
//         )}

//         {/* SUPER TAB VIEW */}
//         {activeStaffTab === 'super' && (
//           <View style={s.card}>
//             <SectionLabel>Employee Details</SectionLabel>
//             <Field label="Full Name">
//               <StyledInput
//                 value={superFullName}
//                 onChangeText={setSuperFullName}
//                 placeholder="Full Name"
//               />
//             </Field>
//             <Field label="Employee number (if known)">
//               <StyledInput
//                 value={superEmployeeNumber}
//                 onChangeText={setSuperEmployeeNumber}
//                 placeholder="Optional"
//               />
//             </Field>

//             <SectionLabel>Fund Choice</SectionLabel>
//             <RadioGroup
//               options={[
//                 { label: 'I nominate my own fund', value: 'own' },
//                 { label: 'Employer-nominated (default)', value: 'employer' },
//               ]}
//               value={fundChoice}
//               onChange={(v: any) => setFundChoice(v)}
//             />

//             {fundChoice === 'own' && (
//               <View style={s.ownFundBox}>
//                 <View style={s.row2}>
//                   <View style={{ flex: 1 }}>
//                     <Field label="Fund name">
//                       <StyledInput
//                         value={superFundName}
//                         onChangeText={setSuperFundName}
//                         placeholder="e.g. AustralianSuper"
//                       />
//                     </Field>
//                   </View>
//                   <View style={{ flex: 1 }}>
//                     <Field label="Fund ABN">
//                       <StyledInput
//                         value={superFundAbn}
//                         onChangeText={setSuperFundAbn}
//                         placeholder="12 345 678 901"
//                         keyboardType="numeric"
//                       />
//                     </Field>
//                   </View>
//                 </View>
//                 <View style={s.row2}>
//                   <View style={{ flex: 1 }}>
//                     <Field label="Fund USI">
//                       <StyledInput
//                         value={superFundUsi}
//                         onChangeText={setSuperFundUsi}
//                         placeholder="e.g. 12345678901001"
//                       />
//                     </Field>
//                   </View>
//                   <View style={{ flex: 1 }}>
//                     <Field label="Member account No.">
//                       <StyledInput
//                         value={superMemberNumber}
//                         onChangeText={setSuperMemberNumber}
//                         placeholder="Account Number"
//                       />
//                     </Field>
//                   </View>
//                 </View>
//               </View>
//             )}

//             <SectionLabel>Signature & Date</SectionLabel>
//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Signature">
//                   <SignatureButton
//                     value={signatureSuper}
//                     onPress={() => openSignature('super')}
//                     onClear={() => setSignatureSuper('')}
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Date">
//                   <DateButton
//                     value={dateSuper}
//                     placeholder="dd/mm/yyyy"
//                     onPress={() => openDatePicker('dateSuper')}
//                   />
//                 </Field>
//               </View>
//             </View>

//             {/* {getFormUrl('super') && (
//               <TouchableOpacity
//                 style={s.downloadBtn}
//                 onPress={() => openPdf(getFormUrl('super'))}
//               >
//                 <Download size={18} color="#001F3F" />
//                 <Text style={s.downloadBtnText}>View Saved Super PDF</Text>
//               </TouchableOpacity>
//             )} */}
//             <SaveButton
//               label="Save Super Choice"
//               loading={loading}
//               onPress={handleSave}
//             />
//           </View>
//         )}

//         {/* ONBOARDING TAB VIEW */}
//         {activeStaffTab === 'onboarding' && (
//           <View style={s.card}>
//             <SectionLabel>1. Contact Info</SectionLabel>
//             <Field label="Full Name (As per ID)">
//               <StyledInput
//                 value={onboardFullName}
//                 onChangeText={setOnboardFullName}
//                 placeholder="Full Name"
//               />
//             </Field>
//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Mobile Number">
//                   <StyledInput
//                     value={onboardMobile}
//                     onChangeText={setOnboardMobile}
//                     placeholder="0400 000 000"
//                     keyboardType="phone-pad"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Email Address">
//                   <StyledInput
//                     value={onboardEmail}
//                     onChangeText={setOnboardEmail}
//                     placeholder="name@domain.com"
//                     keyboardType="email-address"
//                     autoCapitalize="none"
//                   />
//                 </Field>
//               </View>
//             </View>

//             <View style={{ flex: 1 }}>
//               <Field label="Date of birth">
//                 <DateButton
//                   value={tfnDob}
//                   placeholder="dd/mm/yyyy"
//                   onPress={() => openDatePicker('tfnDob')}
//                 />
//               </Field>
//             </View>

//             <SectionLabel>Residential Address</SectionLabel>
//             <Field label="Street address, suburb, state, postcode">
//               <StyledInput
//                 value={onboardAddress}
//                 onChangeText={(text: string) => {
//                   setOnboardAddress(text);
//                   fetchPlaces(text, true);
//                 }}
//                 placeholder="Start typing your address..."
//               />
//             </Field>

//             {showSuggestions && predictions.length > 0 && (
//               <View style={s.suggestionsContainer}>
//                 {predictions.slice(0, 6).map((item, index) => (
//                   <TouchableOpacity
//                     key={index}
//                     style={s.suggestionItem}
//                     onPress={() =>
//                       fetchPlaceDetails(item.place_id, item.description, true)
//                     }
//                   >
//                     <Text style={s.suggestionText}>{item.description}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}

//             <SectionLabel>2. Passport & Work Rights</SectionLabel>
//             <View style={s.row3}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Passport No.">
//                   <StyledInput
//                     value={passportNumber}
//                     onChangeText={setPassportNumber}
//                     placeholder="N1234567"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Country">
//                   <StyledInput
//                     value={passportCountry}
//                     onChangeText={setPassportCountry}
//                     placeholder="Australia"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Expiry">
//                   <DateButton
//                     value={passportExpiry}
//                     placeholder="dd/mm/yyyy"
//                     onPress={() => openDatePicker('passportExp')}
//                   />
//                 </Field>
//               </View>
//             </View>
//             <Field label="Work Rights Status">
//               <RadioGroup
//                 options={[
//                   { label: 'Australian Citizen / PR', value: 'citizen' },
//                   { label: 'Student Visa (24h Cap)', value: 'student' },
//                   { label: 'Other Visa Holder', value: 'other' },
//                 ]}
//                 value={workRights}
//                 onChange={setWorkRights}
//               />
//             </Field>

//             <SectionLabel>3. 100-Point Identification Check</SectionLabel>
//             <View style={s.idTable}>
//               <IdCheckRow
//                 label="Primary ID (Passport / Birth Cert) - 70 Pts"
//                 checked={idChecks.primary_id}
//                 onPress={() =>
//                   setIdChecks(p => ({ ...p, primary_id: !p.primary_id }))
//                 }
//               />
//               <IdCheckRow
//                 label="Drivers License / Govt Photo ID - 40 Pts"
//                 checked={idChecks.drivers_license}
//                 onPress={() =>
//                   setIdChecks(p => ({
//                     ...p,
//                     drivers_license: !p.drivers_license,
//                   }))
//                 }
//               />
//               <IdCheckRow
//                 label="Security Licence (Mandatory) - 40 Pts"
//                 checked={idChecks.security_license}
//                 onPress={() =>
//                   setIdChecks(p => ({
//                     ...p,
//                     security_license: !p.security_license,
//                   }))
//                 }
//               />
//               <IdCheckRow
//                 label="Medicare / Utility / Statement - 25 Pts"
//                 checked={idChecks.medicare_or_utility}
//                 onPress={() =>
//                   setIdChecks(p => ({
//                     ...p,
//                     medicare_or_utility: !p.medicare_or_utility,
//                   }))
//                 }
//               />
//             </View>

//             <SectionLabel>4. Bank Details</SectionLabel>
//             <Field label="Bank Name">
//               <StyledInput
//                 value={bankName}
//                 onChangeText={setBankName}
//                 placeholder="e.g. CommBank"
//               />
//             </Field>
//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="BSB">
//                   <StyledInput
//                     value={bsb}
//                     onChangeText={setBsb}
//                     placeholder="000-000"
//                     keyboardType="numeric"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Account Number">
//                   <StyledInput
//                     value={accountNumber}
//                     onChangeText={setAccountNumber}
//                     placeholder="1234 5678"
//                     keyboardType="numeric"
//                   />
//                 </Field>
//               </View>
//             </View>

//             {/* NEW: Tax & Super Details */}
//             <SectionLabel>5. Tax & Superannuation Details</SectionLabel>

//             <Field label="Tax File Number (TFN)">
//               <StyledInput
//                 value={onboardTfn}
//                 onChangeText={setOnboardTfn}
//                 placeholder="000 000 000"
//                 keyboardType="numeric"
//                 maxLength={11}
//               />
//             </Field>

//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Super Fund Name">
//                   <StyledInput
//                     value={onboardSuperFundName}
//                     onChangeText={setOnboardSuperFundName}
//                     placeholder="e.g. AustralianSuper"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Super USI">
//                   <StyledInput
//                     value={onboardSuperUsi}
//                     onChangeText={setOnboardSuperUsi}
//                     placeholder="123456789012345"
//                   />
//                 </Field>
//               </View>
//             </View>

//             <Field label="Member Number">
//               <StyledInput
//                 value={onboardMemberNumber}
//                 onChangeText={setOnboardMemberNumber}
//                 placeholder="Member Account Number"
//               />
//             </Field>

//             <SectionLabel>6. Licenses & Certs</SectionLabel>
//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Security licence No.">
//                   <StyledInput
//                     value={securityLicence}
//                     onChangeText={setSecurityLicence}
//                     placeholder="VIC 123456"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Security Licence Expiry">
//                   <DateButton
//                     value={securityExpiry}
//                     placeholder="dd/mm/yyyy"
//                     onPress={() => openDatePicker('secExp')}
//                   />
//                 </Field>
//               </View>
//             </View>
//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="First Aid Certificate No.">
//                   <StyledInput
//                     value={firstAidNumber}
//                     onChangeText={setFirstAidNumber}
//                     placeholder="FA-001234"
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="First Aid Expiry">
//                   <DateButton
//                     value={firstAidExpiry}
//                     placeholder="dd/mm/yyyy"
//                     onPress={() => openDatePicker('faExp')}
//                   />
//                 </Field>
//               </View>
//             </View>

//             <SectionLabel>Declaration & Signature</SectionLabel>
//             <View style={s.row2}>
//               <View style={{ flex: 1 }}>
//                 <Field label="Employee signature">
//                   <SignatureButton
//                     value={signatureOnboard}
//                     onPress={() => openSignature('onboard')}
//                     onClear={() => setSignatureOnboard('')}
//                   />
//                 </Field>
//               </View>
//               <View style={{ flex: 1 }}>
//                 <Field label="Date">
//                   <DateButton
//                     value={dateOnboard}
//                     placeholder="dd/mm/yyyy"
//                     onPress={() => openDatePicker('dateOnboard')}
//                   />
//                 </Field>
//               </View>
//             </View>

//             {/* {getFormUrl('onboarding') && (
//               <TouchableOpacity
//                 style={s.downloadBtn}
//                 onPress={() => openPdf(getFormUrl('onboarding'))}
//               >
//                 <Download size={18} color="#001F3F" />
//                 <Text style={s.downloadBtnText}>View Saved Onboarding PDF</Text>
//               </TouchableOpacity>
//             )} */}
//             <SaveButton
//               label="Save Onboarding Form"
//               loading={loading}
//               onPress={handleSave}
//             />
//           </View>
//         )}
//       </ScrollView>

//       {/* Date Picker Overlay */}
//       {showDatePicker && (
//         <DateTimePicker
//           value={new Date()}
//           mode="date"
//           textColor="#fff"
//           display={Platform.OS === 'ios' ? 'spinner' : 'default'}
//           onChange={handleDateChange}
//         />
//       )}

//       {/* ── Signature Modal ── */}
//       <Modal visible={showSignatureModal} animationType="slide">
//         <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
//           <View style={s.sigModalHeader}>
//             <TouchableOpacity
//               onPress={() => setShowSignatureModal(false)}
//               style={s.sigCancelBtn}
//             >
//               <X size={18} color="#ef4444" />
//               <Text style={s.sigCancelText}>Cancel</Text>
//             </TouchableOpacity>
//             <Text style={s.sigModalTitle}>Draw Signature</Text>
//             <View style={{ width: 80 }} />
//           </View>
//           <View style={s.sigHint}>
//             <Text style={s.sigHintText}>
//               Use your finger to draw your signature in the area below
//             </Text>
//           </View>
//           <View style={{ flex: 1 }}>
//             <SignatureScreen
//               onOK={sig => handleSaveSignature(sig)}
//               onEmpty={() =>
//                 Toast.show({ type: 'error', text1: 'Please draw a signature' })
//               }
//               autoClear={false}
//               descriptionText=""
//               clearText="Clear"
//               confirmText="Save Signature"
//               webStyle={`
//                 * { box-sizing: border-box; }
//                 html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #fafafa; }
//                 .m-signature-pad { position: absolute; inset: 0; box-shadow: none; border: none; background: #fafafa; }
//                 .m-signature-pad--body { position: absolute; top: 12px; left: 12px; right: 12px; bottom: 70px;
//                   border: 2px dashed #CBD5E1; border-radius: 12px; background: #fff; }
//                 canvas { width: 100% !important; height: 100% !important; border-radius: 12px; }
//                 .m-signature-pad--footer { position: absolute; bottom: 0; left: 0; right: 0; height: 70px;
//                   display: flex; justify-content: space-between; align-items: center;
//                   padding: 10px 16px; background: #fff; border-top: 1px solid #e2e8f0; }
//                 .m-signature-pad--footer .button { border-radius: 10px; font-size: 15px;
//                   font-weight: 600; cursor: pointer; border: none; }
//                 .m-signature-pad--footer .button.clear { background: #fef2f2; color: #ef4444; }
//                 .m-signature-pad--footer .button.save  { background: #2EB1E2; color: #fff;    }
//               `}
//             />
//           </View>
//         </SafeAreaView>
//       </Modal>

//       {/* Title Options Modal */}
//       <Modal visible={showTitleModal} transparent animationType="fade">
//         <TouchableOpacity
//           style={s.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setShowTitleModal(false)}
//         >
//           <View style={s.modalSheet}>
//             <View style={s.modalHandle} />
//             <Text style={s.modalSheetTitle}>Select Title</Text>
//             {titleOptions.map(t => (
//               <TouchableOpacity
//                 key={t}
//                 style={[s.modalOption, tfnTitle === t && s.modalOptionActive]}
//                 onPress={() => {
//                   setTfnTitle(t);
//                   setShowTitleModal(false);
//                 }}
//               >
//                 <Text
//                   style={[
//                     s.modalOptionText,
//                     tfnTitle === t && s.modalOptionTextActive,
//                   ]}
//                 >
//                   {t}
//                 </Text>
//                 {tfnTitle === t && <Check size={16} color={BRAND_DARK} />}
//               </TouchableOpacity>
//             ))}
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </SafeAreaView>
//   );
// };

// // ══════════════════ Reusable Form Components ══════════════════
// const SectionLabel = ({ children }: { children: string }) => (
//   <View style={s.sectionLabelWrap}>
//     <Text style={s.sectionLabelText}>{children}</Text>
//   </View>
// );

// const Field = ({
//   label,
//   children,
// }: {
//   label: string;
//   children: React.ReactNode;
// }) => (
//   <View style={s.fieldWrap}>
//     <Text style={s.fieldLabel}>{label}</Text>
//     {children}
//   </View>
// );

// const StyledInput = (props: any) => (
//   <TextInput
//     style={s.input}
//     placeholderTextColor="rgba(255,255,255,0.4)"
//     autoCorrect={false}
//     {...props}
//   />
// );

// const DateButton = ({ value, placeholder, onPress }: any) => (
//   <TouchableOpacity style={s.dateBtn} onPress={onPress}>
//     <Text style={[s.dateBtnText, !value && { color: 'rgba(255,255,255,0.4)' }]}>
//       {value || placeholder}
//     </Text>
//   </TouchableOpacity>
// );

// const SignatureButton = ({ value, onPress, onClear }: any) => (
//   <View style={s.sigContainer}>
//     {value ? (
//       <View style={s.sigUploadedBox}>
//         <Text style={s.sigUploadedText}>✓ Signature Added</Text>
//         <TouchableOpacity onPress={onClear} style={s.sigClearBtn}>
//           <X size={14} color="#EF4444" />
//         </TouchableOpacity>
//       </View>
//     ) : (
//       <TouchableOpacity style={s.sigPlaceholderBtn} onPress={onPress}>
//         <Text style={s.sigPlaceholderText}>Tap to add signature</Text>
//       </TouchableOpacity>
//     )}
//   </View>
// );

// const SaveButton = ({ label, loading, onPress }: any) => (
//   <TouchableOpacity style={s.saveBtn} onPress={onPress} disabled={loading}>
//     {loading ? (
//       <ActivityIndicator size="small" color={BRAND_DARK} />
//     ) : (
//       <Text style={s.saveBtnText}>{label}</Text>
//     )}
//   </TouchableOpacity>
// );

// const IdCheckRow = ({ label, checked, onPress }: any) => (
//   <TouchableOpacity style={s.idRow} onPress={onPress}>
//     <Text style={s.idRowText}>{label}</Text>
//     <View style={[s.idCheckCircle, checked && s.idCheckCircleOn]}>
//       {checked && <Check size={12} color={BRAND_DARK} />}
//     </View>
//   </TouchableOpacity>
// );

// const RadioGroup = ({ options, value, onChange }: any) => (
//   <View style={s.radioGroup}>
//     {options.map((opt: any) => (
//       <TouchableOpacity
//         key={opt.value}
//         style={s.radioOpt}
//         onPress={() => onChange(opt.value)}
//       >
//         <View style={[s.radioCircle, value === opt.value && s.radioCircleOn]}>
//           {value === opt.value && <View style={s.radioDot} />}
//         </View>
//         <Text style={[s.radioLabel, value === opt.value && s.radioLabelOn]}>
//           {opt.label}
//         </Text>
//       </TouchableOpacity>
//     ))}
//   </View>
// );

// const YesNoGroup = ({ value, onChange }: any) => (
//   <View style={s.yesNoRow}>
//     {['yes', 'no'].map(opt => (
//       <TouchableOpacity
//         key={opt}
//         style={[s.yesNoBtn, value === opt && s.yesNoBtnOn]}
//         onPress={() => onChange(opt)}
//       >
//         <Text style={[s.yesNoText, value === opt && s.yesNoTextOn]}>
//           {opt.toUpperCase()}
//         </Text>
//       </TouchableOpacity>
//     ))}
//   </View>
// );

// // ═══════════════════════════════════════════════════════════════════════════
// // STYLES
// // ═══════════════════════════════════════════════════════════════════════════
// const s = StyleSheet.create({
//   container: {
//     flex: 1,
//     // backgroundColor: '#001F3F'
//     backgroundColor: '#111111',
//   },
//   loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   loadingText: { marginTop: 12, color: '#fff', fontSize: 14 },
//   header: {
//     height: 56,
//     backgroundColor: BRAND_DARK,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 12,
//   },
//   headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
//   backBtn: {
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   tabBar: {
//     flexDirection: 'row',
//     backgroundColor: BRAND_LIGHT,
//     padding: 4,
//     borderRadius: 8,
//     marginHorizontal: 10,
//     marginTop: 8,
//   },
//   tabItem: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 8,
//     borderRadius: 6,
//     gap: 6,
//   },
//   suggestionsContainer: {
//     backgroundColor: CARD_BG,
//     borderWidth: 1,
//     borderColor: '#475569',
//     borderRadius: 10,
//     marginTop: 4,
//     marginBottom: 12,
//     maxHeight: 220,
//     overflow: 'hidden',
//     zIndex: 10,
//   },
//   suggestionItem: {
//     padding: 14,
//     borderBottomWidth: 1,
//     borderBottomColor: '#334155',
//   },
//   suggestionText: {
//     color: '#fff',
//     fontSize: 14,
//     lineHeight: 20,
//   },
//   tabItemActive: { backgroundColor: BRAND },
//   tabText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
//   tabTextActive: { color: BRAND_DARK },
//   scrollContent: { padding: 12, paddingBottom: 40 },
//   card: {
//     backgroundColor: CARD_BG,
//     borderRadius: 16,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: 'rgba(137, 231, 208, 0.1)',
//   },
//   sectionLabelWrap: {
//     marginTop: 16,
//     marginBottom: 8,
//     borderLeftWidth: 3,
//     borderLeftColor: BRAND,
//     paddingLeft: 8,
//   },
//   sectionLabelText: {
//     color: BRAND,
//     fontSize: 13,
//     fontWeight: '700',
//     textTransform: 'uppercase',
//   },
//   fieldWrap: { marginBottom: 12 },
//   fieldLabel: {
//     color: '#94A3B8',
//     fontSize: 11,
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   input: {
//     // backgroundColor: '#001F3F',
//     borderWidth: 1,
//     borderColor: '#475569',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontSize: 14,
//     color: '#fff',
//   },
//   row2: { flexDirection: 'row', gap: 10 },
//   row3: { flexDirection: 'row', gap: 8 },
//   selectBtn: {
//     // backgroundColor: '#001F3F',
//     borderWidth: 1,
//     borderColor: '#475569',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   selectText: { color: '#fff', fontSize: 14 },
//   dateBtn: {
//     // backgroundColor: '#001F3F',
//     borderWidth: 1,
//     borderColor: '#475569',
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//   },
//   dateBtnText: { color: '#fff', fontSize: 14 },
//   sigContainer: { height: 44, justifyContent: 'center' },
//   sigPlaceholderBtn: {
//     // backgroundColor: '#001F3F',
//     borderWidth: 1,
//     borderStyle: 'dashed',
//     borderColor: BRAND,
//     borderRadius: 10,
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   sigPlaceholderText: { color: BRAND, fontSize: 13, fontWeight: '600' },
//   sigUploadedBox: {
//     // backgroundColor: '#001F3F',
//     borderWidth: 1,
//     borderColor: BRAND,
//     borderRadius: 10,
//     height: '100%',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//   },
//   sigUploadedText: { color: BRAND, fontSize: 13, fontWeight: '600' },
//   sigClearBtn: { padding: 4 },
//   saveBtn: {
//     backgroundColor: BRAND,
//     borderRadius: 12,
//     paddingVertical: 14,
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   saveBtnText: { color: BRAND_DARK, fontSize: 15, fontWeight: '700' },
//   downloadBtn: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     paddingVertical: 12,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 12,
//     gap: 8,
//   },
//   downloadBtnText: {
//     //  color: '#001F3F',
//     fontSize: 14,
//     fontWeight: '700',
//   },
//   ownFundBox: {
//     backgroundColor: 'rgba(0,0,0,0.15)',
//     padding: 10,
//     borderRadius: 12,
//     marginTop: 4,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#475569',
//   },
//   radioGroup: { gap: 8, marginVertical: 4 },
//   radioOpt: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     paddingVertical: 4,
//   },
//   radioCircle: {
//     width: 16,
//     height: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#475569',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   radioCircleOn: { borderColor: BRAND },
//   radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
//   radioLabel: { color: '#94A3B8', fontSize: 13 },
//   radioLabelOn: { color: '#fff' },
//   yesNoRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
//   yesNoBtn: {
//     flex: 1,
//     height: 40,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#475569',
//     alignItems: 'center',
//     justifyContent: 'center',
//     // backgroundColor: '#0A253F',
//   },
//   yesNoBtnOn: {
//     backgroundColor: 'rgba(137, 231, 208, 0.15)',
//     borderColor: BRAND,
//   },
//   yesNoText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
//   yesNoTextOn: { color: BRAND },
//   idTable: {
//     borderWidth: 1,
//     borderColor: 'rgba(137, 231, 208, 0.2)',
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginBottom: 16,
//   },
//   idRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 12,
//     backgroundColor: BRAND_LIGHT,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(137, 231, 208, 0.1)',
//   },
//   idRowText: { color: '#94A3B8', fontSize: 12 },
//   idCheckCircle: {
//     width: 18,
//     height: 18,
//     borderRadius: 4,
//     borderWidth: 1,
//     borderColor: '#475569',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   idCheckCircleOn: { backgroundColor: BRAND, borderColor: BRAND },
//   sigModalHeader: {
//     height: 56,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//   },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 31, 63, 0.6)',
//     justifyContent: 'flex-end',
//   },
//   modalSheet: {
//     backgroundColor: CARD_BG,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 16,
//     paddingBottom: 30,
//   },
//   modalHandle: {
//     width: 40,
//     height: 4,
//     backgroundColor: '#475569',
//     borderRadius: 2,
//     alignSelf: 'center',
//     marginBottom: 12,
//   },
//   modalSheetTitle: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '700',
//     marginBottom: 12,
//     textAlign: 'center',
//   },
//   modalOption: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(255,255,255,0.05)',
//   },
//   modalOptionActive: { opacity: 0.8 },
//   modalOptionText: { color: '#94A3B8', fontSize: 15 },
//   modalOptionTextActive: { color: BRAND, fontWeight: '600' },
//   sigCancelBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   sigCancelText: {
//     color: ERROR,
//     fontSize: 15,
//     fontWeight: '600',
//   },
//   sigModalTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   sigHint: {
//     backgroundColor: BRAND_LIGHT,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(137, 231, 208, 0.2)',
//   },
//   sigHintText: {
//     fontSize: 12,
//     color: '#94A3B8',
//     textAlign: 'center',
//   },
//   tabBtn: {
//     flex: 1,
//     // paddingVertical: 12,
//     alignItems: 'center',
//     padding: 7,
//     borderRadius: 8,
//     backgroundColor: BRAND_LIGHT,
//   },
//   tabBtnActive: {
//     backgroundColor: BRAND,
//     shadowColor: BRAND,
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.4,
//     shadowRadius: 10,
//     elevation: 8,
//   },
//   tabLabel: {
//     fontSize: 10,
//     fontWeight: '700',
//     color: '#94A3B8',
//     marginTop: 4,
//   },
//   tabLabelActive: {
//     color: BRAND_DARK,
//     fontWeight: '700',
//   },
// });

// export default StaffFormsScreen;

import React, { useState, useEffect, useRef } from "react";
import ReactNativeBlobUtil from "react-native-blob-util";
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
} from "react-native";

import RNFS from "react-native-fs";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Building2,
  BadgeCheck,
  Send,
  X,
  Check,
  Lock,
  Download,
} from "lucide-react-native";
import FileViewer from "react-native-file-viewer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { getUserProfile, uploadFile } from "../services/authApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import SignatureScreen from "react-native-signature-canvas";
import axios from "axios";
import { generatePDF as pdfConvert } from "react-native-html-to-pdf";
import * as DocumentPicker from "@react-native-documents/picker";
import { pick, types } from "@react-native-documents/picker";

const BASE_URL = "https://apis.staffoo.com.au";
const GOOGLE_API_KEY = "AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY";
const BRAND = "#89E7D0";
const BRAND_DARK = "#111111";
const BRAND_LIGHT = "#111111";
const ACCENT = "#0047FF";
const SUCCESS = "#89E7D0";
const ERROR = "#EF4444";
const GRAY_BG = "#001F3F";
const CARD_BG = "#111111";

type StaffTab = "tfn" | "super" | "onboarding";

type FormUrls = {
  tfn?: string;
  super_form?: string;
  onboarding?: string;
};

const StaffFormsScreen = ({ navigation }: any) => {
  const [activeStaffTab, setActiveStaffTab] = useState<StaffTab>("onboarding");
  const [userId, setUserId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const tabAnim = useRef(new Animated.Value(0)).current;
  const [tabLoading, setTabLoading] = useState(false);

  // ── TFN Fields ──────────────────────────────────────────────────────────────
  const [tfnNumber, setTfnNumber] = useState("");
  const [tfnTitle, setTfnTitle] = useState("");
  const [tfnFirstName, setTfnFirstName] = useState("");
  const [tfnSurname, setTfnSurname] = useState("");
  const [tfnPrevName, setTfnPrevName] = useState("");
  const [tfnDob, setTfnDob] = useState("");
  const [tfnDobBackend, setTfnDobBackend] = useState("");
  const [tfnAddress, setTfnAddress] = useState("");
  const [basisOfPayment, setBasisOfPayment] = useState<string | null>(null);
  const [australianResident, setAustralianResident] = useState<string | null>(
    null,
  );
  const [claimTaxFree, setClaimTaxFree] = useState<string | null>(null);
  const [hasDebt, setHasDebt] = useState<string | null>(null);
  const [signatureTfn, setSignatureTfn] = useState("");
  const [dateTfn, setDateTfn] = useState("");
  const [dateTfnBackend, setDateTfnBackend] = useState("");

  // ── Super Fields ────────────────────────────────────────────────────────────
  const [superFullName, setSuperFullName] = useState("");
  const [superEmployeeNumber, setSuperEmployeeNumber] = useState("");
  const [fundChoice, setFundChoice] = useState<"own" | "employer">("employer");
  const [superFundName, setSuperFundName] = useState("");
  const [superFundAbn, setSuperFundAbn] = useState("");
  const [superFundUsi, setSuperFundUsi] = useState("");
  const [superMemberNumber, setSuperMemberNumber] = useState("");
  const [signatureSuper, setSignatureSuper] = useState("");
  const [dateSuper, setDateSuper] = useState("");
  const [dateSuperBackend, setDateSuperBackend] = useState("");
  const [formUrls, setFormUrls] = useState<FormUrls>({});

  // ── Onboarding Fields ───────────────────────────────────────────────────────
  const [onboardTfn, setOnboardTfn] = useState("");
  const [onboardSuperFundName, setOnboardSuperFundName] = useState("");
  const [onboardSuperUsi, setOnboardSuperUsi] = useState("");
  const [onboardMemberNumber, setOnboardMemberNumber] = useState("");
  const [onboardFullName, setOnboardFullName] = useState("");
  const [onboardMobile, setOnboardMobile] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");
  const [onboardAddress, setOnboardAddress] = useState("");

  const [passportNumber, setPassportNumber] = useState("");
  const [passportCountry, setPassportCountry] = useState("Australia");

  // UI Display Dates
  const [onboardDob, setOnboardDob] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [securityExpiry, setSecurityExpiry] = useState("");
  const [firstAidExpiry, setFirstAidExpiry] = useState("");

  // API Backend Dates (YYYY-MM-DD)
  const [onboardDobBackend, setOnboardDobBackend] = useState("");
  const [passportExpiryBackend, setPassportExpiryBackend] = useState("");
  const [securityExpiryBackend, setSecurityExpiryBackend] = useState("");
  const [firstAidExpiryBackend, setFirstAidExpiryBackend] = useState("");

  const [workRights, setWorkRights] = useState<string | null>(null);
  const [otherVisaType, setOtherVisaType] = useState("");
  const [residentialStatus, setResidentialStatus] = useState<string | null>(
    null,
  );

  // ── Security Licence Verification State ────────────────────────────────────
  const [verifyingSecurity, setVerifyingSecurity] = useState(false);
  const [isSecurityVerified, setIsSecurityVerified] = useState(false);

  const [idChecks, setIdChecks] = useState({
    primary_id: false,
    drivers_license: false,
    security_license: false,
    medicare_or_utility: false,
  });
  const [bankName, setBankName] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [securityLicence, setSecurityLicence] = useState("");
  const [firstAidNumber, setFirstAidNumber] = useState("");

  const [signatureOnboard, setSignatureOnboard] = useState("");
  const [dateOnboard, setDateOnboard] = useState("");
  const [dateOnboardBackend, setDateOnboardBackend] = useState("");
  const [superConfirmation, setSuperConfirmation] = useState(false);

  // ── Document Upload State ─────────────────────────────────────────────────
  const [passportDoc, setPassportDoc] = useState("");
  const [passportDocName, setPassportDocName] = useState("");
  const [passportDocUploading, setPassportDocUploading] = useState(false);

  const [securityLicenseDoc, setSecurityLicenseDoc] = useState("");
  const [securityLicenseDocName, setSecurityLicenseDocName] = useState("");
  const [securityLicenseDocUploading, setSecurityLicenseDocUploading] =
    useState(false);

  const [firstAidDoc, setFirstAidDoc] = useState("");
  const [firstAidDocName, setFirstAidDocName] = useState("");
  const [firstAidDocUploading, setFirstAidDocUploading] = useState(false);

  // ── UI State ────────────────────────────────────────────────────────────────
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateField, setSelectedDateField] = useState<string | null>(
    null,
  );
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSignatureField, setCurrentSignatureField] = useState<
    "tfn" | "super" | "onboard" | null
  >(null);

  const Api_Url = "https://apis.thescouts.com.au/api";
  const titleOptions = ["Mr", "Mrs", "Miss"];
  const autoFullName = [tfnTitle, tfnFirstName, tfnSurname]
    .filter(Boolean)
    .join(" ");

  // ── Init + Auto-fill Profile Data ───────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (!storedUser) return;

        const parsed = JSON.parse(storedUser);
        setUserId(parsed.id);

        const profileResponse = await getUserProfile(parsed.id);
        const profile = profileResponse?.data || {};

        if (profile.name) {
          const fullName = profile.name.trim();
          setTfnFirstName(fullName.split(" ")[0] || "");
          setTfnSurname(fullName.split(" ").slice(1).join(" ") || "");
          setSuperFullName(fullName);
          setOnboardFullName(fullName);
        }

        if (profile.email) setOnboardEmail(profile.email);
        if (profile.phone) setOnboardMobile(profile.phone);
        if (profile.address) {
          setOnboardAddress(profile.address);
          setTfnAddress(profile.address);
        }

        const dobRaw =
          profile.staff?.date_of_birth ||
          profile.date_of_birth ||
          profile.dob ||
          profile.staff?.dob;

        if (dobRaw) {
          const formattedDob = formatDateToDDMMYYYY(dobRaw);
          setTfnDob(formattedDob);
          setTfnDobBackend(dobRaw);
          setOnboardDob(formattedDob);
          setOnboardDobBackend(dobRaw);
        }
      } catch (e) {
        console.log("Profile load error:", e);
      }
      setFetching(false);
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
    const dd = ("0" + selectedDate.getDate()).slice(-2);
    const mm = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
    const yyyy = selectedDate.getFullYear();
    const display = `${dd}/${mm}/${yyyy}`;
    const backend = selectedDate.toISOString().split("T")[0];

    switch (selectedDateField) {
      case "tfnDob":
        setTfnDob(display);
        setTfnDobBackend(backend);
        break;
      case "onboardDob":
        setOnboardDob(display);
        setOnboardDobBackend(backend);
        break;
      case "dateTfn":
        setDateTfn(display);
        setDateTfnBackend(backend);
        break;
      case "dateSuper":
        setDateSuper(display);
        setDateSuperBackend(backend);
        break;
      case "dateOnboard":
        setDateOnboard(display);
        setDateOnboardBackend(backend);
        break;
      case "passportExp":
        setPassportExpiry(display);
        setPassportExpiryBackend(backend);
        break;
      // secExp is intentionally NOT handled here — it's locked after verification
      case "faExp":
        setFirstAidExpiry(display);
        setFirstAidExpiryBackend(backend);
        break;
    }
  };

  const openSignature = (f: "tfn" | "super" | "onboard") => {
    setCurrentSignatureField(f);
    setShowSignatureModal(true);
  };

  useEffect(() => {
    const loadAllFormData = async () => {
      if (userId && activeStaffTab) {
        resetAllFields();
        setTabLoading(true);
        await fetchExistingForms(userId);
        await fetchFormData(userId);
        setTabLoading(false);
      }
    };

    loadAllFormData();

    const unsubscribe = navigation.addListener("focus", () => {
      loadAllFormData();
    });

    return unsubscribe;
  }, [activeStaffTab, userId, navigation]);

  const fetchExistingForms = async (id: number | string) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await axios.get(`${BASE_URL}/api/form-data`, {
        params: { user_id: id, type: "all" },
        headers: { Authorization: `Bearer ${token}` },
      });
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
      console.log("Failed to fetch existing forms", e);
    }
  };

  // ── Security Licence Verification ─────────────────────────────────────────
  /**
   * Verifies the security licence number via the API.
   * On success:
   *  - Auto-fills the expiry date (display + backend)
   *  - Locks the expiry date field (isSecurityVerified = true)
   *  - Shows a success toast
   * On failure:
   *  - Resets isSecurityVerified to false
   *  - Shows an error toast
   * Changing the licence number resets verification state (handled in onChangeText).
   */
  const handleVerifySecurityLicence = async () => {
    if (!securityLicence.trim()) {
      Toast.show({
        type: "error",
        text1: "Please enter Security Licence Number",
        position: "bottom",
      });
      return;
    }

    try {
      setVerifyingSecurity(true);

      const token = await getToken();
      const payload = {
        document_type: "Security License",
        license_number: securityLicence.trim(),
      };

      const response = await axios.post(
        `${Api_Url}/documents-online-verification-staffoo`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = response?.data;

      if (data?.success === false) {
        setIsSecurityVerified(false);
        Toast.show({
          type: "error",
          text1: data?.message || "Verification failed",
        });
        return;
      }

      const expiryRaw =
        data?.expiry ||
        data?.expiry_date ||
        data?.document_expiry ||
        data?.data?.expiry ||
        data?.data?.expiry_date;

      if (expiryRaw) {
        const dateObj = parseApiExpiryDate(expiryRaw);
        if (dateObj) {
          const dd = String(dateObj.getDate()).padStart(2, "0");
          const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
          const yyyy = dateObj.getFullYear();
          const displayDate = `${dd}/${mm}/${yyyy}`;
          const backendDate = `${yyyy}-${mm}-${dd}`;

          // Auto-fill both display and backend expiry values
          setSecurityExpiry(displayDate);
          setSecurityExpiryBackend(backendDate);

          // Lock the expiry field — cannot be manually edited after verification
          setIsSecurityVerified(true);

          Toast.show({
            type: "success",
            text1: "✓ Security License verified successfully!",
          });
          return;
        }
      }

      // API succeeded but no expiry date found
      Toast.show({
        type: "error",
        text1: "Verification successful but could not retrieve expiry date",
      });
      setIsSecurityVerified(false);
    } catch (error: any) {
      console.error("Security Verify Error:", error);
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Verification failed",
      });
      setIsSecurityVerified(false);
    } finally {
      setVerifyingSecurity(false);
    }
  };

  const parseApiExpiryDate = (value: string): Date | null => {
    if (!value) return null;

    // DD/MM/YYYY
    const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM-DD
    const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
      const [, yyyy, mm, dd] = yyyymmdd;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback — try native Date parsing
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const handleSaveSignature = async (signature: string) => {
    try {
      if (!signature || signature.length < 100) {
        Toast.show({ type: "error", text1: "Invalid signature" });
        return;
      }
      setLoading(true);
      const base64Data = signature.replace("data:image/png;base64,", "");
      const filePath = `${
        RNFS.CachesDirectoryPath
      }/signature_${Date.now()}.png`;
      await RNFS.writeFile(filePath, base64Data, "base64");
      const file = {
        uri: Platform.OS === "ios" ? `file://${filePath}` : filePath,
        type: "image/png",
        name: `signature_${Date.now()}.png`,
      };
      const uploadResponse = await uploadFile(file);
      const uploadedSignature =
        uploadResponse?.url || uploadResponse?.file || uploadResponse?.path;
      if (!uploadedSignature) throw new Error("Signature upload failed");

      if (currentSignatureField === "tfn") setSignatureTfn(uploadedSignature);
      if (currentSignatureField === "super")
        setSignatureSuper(uploadedSignature);
      if (currentSignatureField === "onboard")
        setSignatureOnboard(uploadedSignature);

      setShowSignatureModal(false);
      Toast.show({
        type: "success",
        text1: "✓ Signature uploaded successfully",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () =>
    (await AsyncStorage.getItem("@auth_token")) ||
    (await AsyncStorage.getItem("auth_token")) ||
    (await AsyncStorage.getItem("@token"));

  // ── Document Upload Helper ────────────────────────────────────────────────
  const uploadDocumentFile = async (
    setUploading: (v: boolean) => void,
    setFileName: (v: string) => void,
    setStoredName: (v: string) => void,
  ) => {
    try {
      const result = await pick({
        allowMultiSelection: false,
        type: [types.pdf, types.doc, types.docx, types.images],
        copyTo: "cachesDirectory",
      });
      const file = result?.[0];
      if (!file) return;

      setUploading(true);
      const token = await getToken();
      const form = new FormData();
      form.append("folder", "staff_documents");
      form.append("file", {
        uri: file.uri,
        type: file.type ?? "application/octet-stream",
        name: file.name ?? `upload_${Date.now()}`,
      } as any);

      const res = await axios.post(`${BASE_URL}/api/upload-file`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const uploaded =
        res.data?.file ||
        res.data?.filename ||
        res.data?.name ||
        res.data?.data?.file ||
        res.data?.data?.filename ||
        res.data?.url ||
        file.name;

      setStoredName(uploaded);
      setFileName(file.name || uploaded);
      Toast.show({ type: "success", text1: "✓ Document uploaded" });
    } catch (err: any) {
      if (err?.code === "CANCELED" || err?.code === "cancel") return;
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: err?.message || "Try again",
      });
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (storedName: string) => {
    if (!storedName) return;
    try {
      const url = storedName.startsWith("http")
        ? storedName
        : `${BASE_URL}/staff_documents/${storedName}`;
      await Linking.openURL(url);
    } catch {
      Toast.show({ type: "error", text1: "Cannot open document" });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF GENERATORS
  // ═══════════════════════════════════════════════════════════════════════════
  const generateTfnPdf = async (data: Record<string, any>): Promise<string> => {
    // Australian Date Format: DD/MM/YYYY
    const formatAUDate = (dateStr?: string): string => {
      if (!dateStr) return "__/__/____";

      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // fallback for invalid dates

        const dd = ("0" + date.getDate()).slice(-2);
        const mm = ("0" + (date.getMonth() + 1)).slice(-2);
        const yyyy = date.getFullYear();

        return `${dd}/${mm}/${yyyy}`;
      } catch {
        return dateStr || "__/__/____";
      }
    };

    const check = (value: any, expectedYes: boolean = true): string => {
      if (value === undefined || value === null) return "☐";
      const val = String(value).toLowerCase().trim();
      if (expectedYes) {
        return val === "1" || val === "yes" || val === "true" || val === "on"
          ? "☑"
          : "☐";
      } else {
        return val === "0" || val === "no" || val === "false" || val === "off"
          ? "☑"
          : "☐";
      }
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; size: A4; }
  body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #222; background: #fff; -webkit-print-color-adjust: exact !important; }
  .header { background-color: #06264d !important; color: #ffffff !important; text-align: center; padding: 22px 20px 18px; }
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
      <div class="field">${data.tfn || "—"}</div>
    </div>
    <div class="section">
      <div class="label">2. Name</div>
      <div style="display:flex; gap:15px;">
        <div style="flex:0.6"><small>Title:</small><div class="field">${
          data.title || ""
        }</div></div>
        <div style="flex:1"><small>First Name:</small><div class="field">${
          data.first_name || ""
        }</div></div>
        <div style="flex:1"><small>Surname:</small><div class="field">${
          data.surname || ""
        }</div></div>
      </div>
    </div>
    <div class="section">
      <div class="label">3. Previous name (if applicable)</div>
      <div class="field">${data.previous_name || "—"}</div>
    </div>
    <div class="section">
      <div class="label">4. Date of birth</div>
      <div class="field">${formatAUDate(data.dob)}</div>
    </div>
    <div class="section">
      <div class="label">5. Residential address</div>
      <div class="field" style="min-height:45px;">${data.address || "—"}</div>
    </div>
    <div class="section">
      <div class="label">6. Employment Type</div>
      <div class="checkbox-line">
        ${check(
          data.basis_of_payment === "full-time",
        )} Full-time &nbsp;&nbsp;&nbsp;
        ${check(
          data.basis_of_payment === "part-time",
        )} Part-time &nbsp;&nbsp;&nbsp;
        ${check(data.basis_of_payment === "casual")} Casual
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
  <div style="margin-top:50px;">
    ${
      data.signature
        ? `<img src="${data.signature}" style="max-height:90px; max-width:320px; object-fit:contain;" />`
        : '<div style="border-bottom:2px solid #333; width:280px; height:70px;"></div>'
    }
    <div style="font-weight:bold; margin-top:8px;">Employee Signature</div>
    <div>Date: ${formatAUDate(data.signed_date || data.date)}</div>
  </div>
</div>
</body>
</html>`;

    const result = await pdfConvert({
      html,
      fileName: `TFN_Declaration_${Date.now()}`,
      directory: "Cache",
      base64: false,
      width: 595,
      height: 842,
    });

    if (!result?.filePath) throw new Error("PDF generation failed");
    return result.filePath;
  };

  const generateSuperPdf = async (
    data: Record<string, any>,
  ): Promise<string> => {
    // Australian Date Format: DD/MM/YYYY
    const formatAUDate = (dateStr?: string): string => {
      if (!dateStr) return "__/__/____";

      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // fallback for invalid dates

        const dd = ("0" + date.getDate()).slice(-2);
        const mm = ("0" + (date.getMonth() + 1)).slice(-2);
        const yyyy = date.getFullYear();

        return `${dd}/${mm}/${yyyy}`;
      } catch {
        return dateStr || "__/__/____";
      }
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; background: #fff; -webkit-print-color-adjust: exact !important; }
  .header { background-color: #06264d !important; color: #ffffff !important; text-align: center; padding: 22px 20px 18px; }
  body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; color: #222; background: #fff; }
  .page { width: 100%; padding: 0; }
  .header-title { font-size: 30px; font-weight: bold; letter-spacing: 1px; margin-bottom: 5px; }
  .header-sub { font-size: 11px; opacity: 0.95; }
  .content { padding: 22px 28px 30px; }
  .title { color: #2563eb; font-size: 17px; font-weight: bold; margin-bottom: 6px; }
  .title-line { height: 2px; background: #3b82f6; margin-bottom: 12px; }
  .form-box { border: 1px solid #d7d7d7; }
  .section { border-bottom: 1px solid #dcdcdc; padding: 10px 12px; }
  .label { font-size: 10px; font-weight: bold; margin-bottom: 5px; color: #222; }
  .field { border-bottom: 1px solid #888; min-height: 16px; font-size: 11px; padding-bottom: 2px; word-wrap: break-word; }
  .checkbox-line { font-size: 10px; margin-top: 4px; line-height: 1.7; }
  .employer-box { border: 1px solid #dcdcdc; padding: 10px 12px; margin-top: 10px; }
  .employer-title { font-size: 10px; font-weight: bold; margin-bottom: 6px; }
  .small { font-size: 9px; line-height: 1.5; }
  .signature-area { margin-top: 18px; }
  .signature-line { border-bottom: 1px solid #666; height: 80px; position: relative; padding: 5px; }
  .signature-img { position: absolute; width: 100%; height: 100%; object-fit: contain; transform: scale(1.2); }
  .signature-label { font-size: 9px; font-weight: bold; margin-top: 4px; }
  .date { font-size: 9px; margin-top: 2px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-title">STAFFOO</div>
    <div class="header-sub">Capital Services Pty Ltd | ABN: 48 613 317 838</div>
  </div>
  <div class="content">
    <div class="title">Superannuation Standard Choice Form</div>
    <div class="title-line"></div>
    <div class="form-box">
      <div class="section">
        <div class="label">Employee Details</div>
        <div style="margin-bottom:10px;">
          <div class="small">Name:</div>
          <div class="field">${data.full_name || ""}</div>
        </div>
        <div>
          <div class="small">Employee Number (if known):</div>
          <div class="field">${data.employee_number || ""}</div>
        </div>
      </div>
      <div class="section">
        <div class="label">Choice of Fund</div>
        <div class="checkbox-line">${
          data.fund_choice === "own" ? "☑" : "☐"
        } 1. I nominate my own individual fund:</div>
        <div style="margin-top:8px;"><div class="small">Fund Name:</div><div class="field">${
          data.fund_name || ""
        }</div></div>
        <div style="margin-top:8px;"><div class="small">Fund ABN:</div><div class="field">${
          data.fund_abn || ""
        }</div></div>
        <div style="margin-top:8px;"><div class="small">Fund USI:</div><div class="field">${
          data.fund_usi || ""
        }</div></div>
        <div style="margin-top:8px;"><div class="small">Member Account Number:</div><div class="field">${
          data.member_account || ""
        }</div></div>
        <div class="checkbox-line" style="margin-top:16px;">${
          data.fund_choice === "employer" ? "☑" : "☐"
        } 2. Employer-nominated fund (default)</div>
      </div>
    </div>
    <div class="employer-box">
      <div class="employer-title">Employer Details (Pre-filled)</div>
      <div class="small">Employer Name: Capital Services Pty Ltd</div>
      <div class="small">ABN: 48 613 317 838</div>
      <div class="small">Address: 21 Tigriswood Blvd, Truganina VIC 3029</div>
    </div>
    <div class="signature-area">
      <div class="signature-line">${
        data.signature
          ? `<img src="${data.signature}" class="signature-img" />`
          : ""
      }</div>
      <div class="signature-label">Employee Signature</div>
      <div class="date">Date: ${formatAUDate(
        data.signed_date || data.date,
      )}</div>
    </div>
  </div>
</div>
</body>
</html>`;

    const result = await pdfConvert({
      html,
      fileName: `superannuation_${Date.now()}`,
      directory: "Cache",
      base64: false,
    });

    if (!result.filePath) throw new Error("Super PDF generation failed");
    return result.filePath;
  };

  const generateOnboardingPdf = async (
    data: Record<string, any>,
  ): Promise<string> => {
    const idRows = [
      {
        label: "Birth cert / Passport / Citizenship",
        pts: 70,
        key: "primary_id",
      },
      {
        label: "Driver's licence / Govt photo ID",
        pts: 40,
        key: "drivers_license",
      },
      {
        label: "Security licence (mandatory)",
        pts: 40,
        key: "security_license",
      },
      {
        label: "Medicare / Utility bill / Bank stmt",
        pts: 25,
        key: "medicare_or_utility",
      },
    ];

    // Australian Date Format: DD/MM/YYYY
    const formatAUDate = (dateStr?: string): string => {
      if (!dateStr) return "__/__/____";

      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // fallback if invalid

        const dd = ("0" + date.getDate()).slice(-2);
        const mm = ("0" + (date.getMonth() + 1)).slice(-2);
        const yyyy = date.getFullYear();

        return `${dd}/${mm}/${yyyy}`; // Clean Australian format
      } catch {
        return dateStr || "__/__/____";
      }
    };

    let normalizedChecks: any = {};
    if (typeof data.id_checks === "string") {
      try {
        normalizedChecks = JSON.parse(data.id_checks);
      } catch (_) {}
    } else {
      normalizedChecks = data.id_checks || {};
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; font-family: Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; color: #222; }
  .header { background-color: #06264d !important; color: #ffffff !important; text-align: center; padding: 22px 20px 18px; display: flex; justify-content: space-between; align-items: center; }
  .header-left { font-size: 24px; font-weight: bold; }
  .header-right { text-align: right; font-size: 8px; line-height: 1.4; }
  .content { padding: 10px 18px 14px; }
  .title { text-align: center; color: #1d4ed8; font-size: 16px; font-weight: bold; margin-bottom: 8px; }
  .notice { border: 1px dashed #2563eb; background: #eef4ff; color: #1e3a8a; font-size: 8px; text-align: center; padding: 5px; margin-bottom: 10px; font-weight: bold; }
  .section-title { background: #f1f5ff; color: #1d4ed8; font-size: 10px; font-weight: bold; padding: 4px 6px; margin-top: 8px; border-left: 3px solid #2563eb; }
  .row { display: flex; gap: 10px; margin-top: 4px; }
  .field { flex: 1; }
  .field-label { font-size: 8px; font-weight: bold; margin-bottom: 2px; color: #333; }
  .field-input { border: 1px solid #d8d8d8; min-height: 16px; padding: 2px 4px; font-size: 9px; background: #fff; }
  .checkbox-line { font-size: 8px; margin-top: 4px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 5px; }
  th { background: #f3f4f6; font-size: 8px; padding: 4px; border: 1px solid #dcdcdc; text-align: left; }
  td { border: 1px solid #e2e2e2; padding: 4px; font-size: 8px; }
  .declaration { margin-top: 10px; border: 1px solid #f2c46d; background: #fff8ea; padding: 6px; font-size: 7px; line-height: 1.5; color: #444; }
  .signature-row { display: flex; justify-content: space-between; margin-top: 10px; }
  .signature-box { width: 220px; }
  .signature-line { border-bottom: 1px solid #666; height: 80px; position: relative; padding: 5px; }
  .signature-img { position: absolute; width: 100%; height: 100%; object-fit: contain; transform: scale(1.2); }
  .signature-label { font-size: 8px; font-weight: bold; margin-top: 3px; }
  .date-box { width: 120px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">STAFFOO</div>
    <div class="header-right">Capital Services Pty Ltd<br/>ABN: 48 613 317 838<br/>21 Tigriswood Blvd, Truganina VIC 3029</div>
  </div>
  <div class="content">
    <div class="title">EMPLOYEE ONBOARDING &amp; ID VERIFICATION FORM</div>
    <div class="notice">MANDATORY: ATTACH CLEAR COPIES OF ALL DOCUMENTS WITH THIS FORM.</div>

    <div class="section-title">1. PERSONAL CONTACT DETAILS</div>
    <div class="row">
      <div class="field"><div class="field-label">Full Name:</div><div class="field-input">${
        data.full_name || ""
      }</div></div>
      <div class="field"><div class="field-label">Date of Birth:</div><div class="field-input">${formatAUDate(
        data.dob,
      )}</div></div>
    </div>
    <div class="row">
      <div class="field"><div class="field-label">Residential Address:</div><div class="field-input">${
        data.address || ""
      }</div></div>
    </div>
    <div class="row">
      <div class="field"><div class="field-label">Mobile Phone Number:</div><div class="field-input">${
        data.mobile || ""
      }</div></div>
      <div class="field"><div class="field-label">Personal Email Address:</div><div class="field-input">${
        data.email || ""
      }</div></div>
    </div>

    <div class="section-title">2. PASSPORT &amp; WORK RIGHTS</div>
    <div class="row">
      <div class="field"><div class="field-label">Passport Number:</div><div class="field-input">${
        data.passport_number || ""
      }</div></div>
      <div class="field"><div class="field-label">Country of Issue:</div><div class="field-input">${
        data.passport_country || ""
      }</div></div>
      <div class="field"><div class="field-label">Passport Expiry Date:</div><div class="field-input">${formatAUDate(
        data.passport_expiry,
      )}</div></div>
    </div>

    <div class="checkbox-line">
      Work Rights Status:
      ${
        data.work_rights === "citizen" ? "[✓]" : "[ ]"
      } Australian Citizen/PR &nbsp;&nbsp;
      ${
        data.work_rights === "student" ? "[✓]" : "[ ]"
      } Student Visa &nbsp;&nbsp;
      ${
        data.work_rights === "temporary" ? "[✓]" : "[ ]"
      } Temporary Visa Holder &nbsp;&nbsp;
      ${
        data.work_rights &&
        !["citizen", "student", "temporary"].includes(data.work_rights)
          ? "[✓]"
          : "[ ]"
      } Other Visa
    </div>

    <div class="section-title">3. 100-POINT IDENTIFICATION CHECK</div>
    <table>
      <tr><th>Document Type</th><th style="width:60px;">Points</th><th style="width:70px;">Tick Attached</th></tr>
      ${idRows
        .map(
          (r) =>
            `<tr><td>${r.label}</td><td>${
              r.pts
            }</td><td style="text-align:center;">${
              normalizedChecks[r.key] ? "[✓]" : "[ ]"
            }</td></tr>`,
        )
        .join("")}
    </table>

    <div class="section-title">4. BANKING, TAX &amp; SUPERANNUATION</div>
    <div class="row">
      <div class="field"><div class="field-label">Bank Name:</div><div class="field-input">${
        data.bank_name || ""
      }</div></div>
      <div class="field"><div class="field-label">BSB Number:</div><div class="field-input">${
        data.bsb || ""
      }</div></div>
      <div class="field"><div class="field-label">Account Number:</div><div class="field-input">${
        data.account_number || ""
      }</div></div>
    </div>
    <div class="row">
      <div class="field"><div class="field-label">Tax File Number:</div><div class="field-input">${
        data.tfn || ""
      }</div></div>
    </div>
    <div class="row">
      <div class="field"><div class="field-label">Super Fund Name:</div><div class="field-input">${
        data.super_fund || ""
      }</div></div>
      <div class="field"><div class="field-label">Super USI:</div><div class="field-input">${
        data.super_usi || ""
      }</div></div>
    </div>
    <div class="row">
      <div class="field"><div class="field-label">Member Number:</div><div class="field-input">${
        data.super_member || ""
      }</div></div>
    </div>

    <div class="section-title">5. LICENCES &amp; CERTIFICATIONS</div>
    <div class="row">
      <div class="field"><div class="field-label">Security licence No:</div><div class="field-input">${
        data.security_license || ""
      }</div></div>
      <div class="field"><div class="field-label">Licence Expiry:</div><div class="field-input">${formatAUDate(
        data.security_license_expiry,
      )}</div></div>
    </div>
    <div class="row">
      <div class="field"><div class="field-label">First Aid Cert No:</div><div class="field-input">${
        data.first_aid_cert || ""
      }</div></div>
      <div class="field"><div class="field-label">First Aid Expiry:</div><div class="field-input">${formatAUDate(
        data.first_aid_expiry,
      )}</div></div>
    </div>

    <div class="declaration">
      I declare that the information provided here is true and authentic.
    </div>

    <div class="signature-row">
      <div class="signature-box">
        <div class="signature-line">
          ${
            data.signature
              ? `<img src="${data.signature}" class="signature-img" />`
              : ""
          }
        </div>
        <div class="signature-label">Signature</div>
      </div>
      <div class="date-box">
        <div style="height:28px; border-bottom:1px solid #666; font-size:10px; padding-top:14px;">
          ${formatAUDate(data.signed_date || data.date)}
        </div>
        <div class="signature-label">Date</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

    const result = await pdfConvert({
      html,
      fileName: `onboarding_${Date.now()}`,
      directory: "Cache",
      base64: false,
    });

    if (!result.filePath) throw new Error("Onboarding PDF generation failed");
    return result.filePath;
  };

  const saveAndOpenPdf = async (cachePath: string) => {
    try {
      await FileViewer.open(cachePath, {
        showOpenWithDialog: true,
        showAppsSuggestions: true,
      });
    } catch (err: any) {
      console.error("File viewer error:", err);
      if (Platform.OS === "android") {
        const uri = cachePath.startsWith("file://")
          ? cachePath
          : `file://${cachePath}`;
        await Linking.openURL(uri).catch(() => {
          Toast.show({ type: "error", text1: "Could not open or save file" });
        });
      }
    }
  };

  const generateUploadAndOpenPdf = async (
    pdfType: "tfn" | "super_form" | "onboarding",
  ) => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Auth token not found");

      const apiType = pdfType === "super_form" ? "superannuation" : pdfType;

      const formRes = await axios.get(`${BASE_URL}/api/form-data`, {
        params: { user_id: userId, type: apiType },
        headers: { Authorization: `Bearer ${token}` },
      });
      const formData = formRes.data?.data || formRes.data || {};

      let pdfFilePath = "";
      if (pdfType === "tfn") {
        pdfFilePath = await generateTfnPdf(formData);
      } else if (pdfType === "super_form") {
        pdfFilePath = await generateSuperPdf(formData);
      } else {
        pdfFilePath = await generateOnboardingPdf(formData);
      }

      const form = new FormData();
      form.append("user_id", String(userId));
      form.append("type", pdfType);
      form.append("folder", "onboarding_forms");
      form.append("file", {
        uri: Platform.OS === "ios" ? pdfFilePath : `file://${pdfFilePath}`,
        type: "application/pdf",
        name: `${pdfType}_${Date.now()}.pdf`,
      } as any);

      await axios.post(`${BASE_URL}/api/upload-staff-file`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      await saveAndOpenPdf(pdfFilePath);
    } catch (error: any) {
      console.error("❌ PDF generate/upload error:", error);
      Toast.show({
        type: "error",
        text1: "PDF Failed",
        text2: error?.response?.data?.message || error?.message || "Try again",
      });
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE / FETCH FLOWS
  // ═══════════════════════════════════════════════════════════════════════════
  const openPdf = async (url?: string) => {
    if (!url) return;
    try {
      if (/^https?:\/\//.test(url)) {
        await Linking.openURL(url);
      } else {
        const localUrl =
          Platform.OS === "android" && !url.startsWith("file://")
            ? `file://${url}`
            : url;
        await FileViewer.open(localUrl);
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "Cannot open PDF" });
    }
  };

  const convertToYesNo = (val: any): string | null => {
    if (val === 1 || val === "1" || val === true || val === "yes") return "yes";
    if (val === 0 || val === "0" || val === false || val === "no") return "no";
    return null;
  };

  const yesNoToBinary = (val: string | null): number | null => {
    if (val === "yes") return 1;
    if (val === "no") return 0;
    return null;
  };

  const formatDateToDDMMYYYY = (dateStr?: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return dateStr;
    }
  };

  const fetchFormData = async (id: number | string) => {
    try {
      setTabLoading(true);

      const token = await getToken();
      if (!token) {
        setTabLoading(false);
        return;
      }

      const apiType =
        activeStaffTab === "super" ? "superannuation" : activeStaffTab;

      const res = await axios.get(`${BASE_URL}/api/form-data`, {
        params: { user_id: id, type: apiType },
        headers: { Authorization: `Bearer ${token}` },
      });

      const formData = res.data?.data;

      if (!formData) {
        console.log(`[Form Info]: No data for ${activeStaffTab}`);
        return;
      }

      // ================= TFN =================
      if (activeStaffTab === "tfn") {
        setTfnNumber(formData.tfn || "");
        setTfnTitle(formData.title || "");
        setTfnFirstName(formData.first_name || "");
        setTfnSurname(formData.surname || "");
        setTfnPrevName(formData.previous_name || "");
        setTfnAddress(formData.address || "");
        setBasisOfPayment(formData.basis_of_payment || "");
        setAustralianResident(convertToYesNo(formData.australian_resident));
        setClaimTaxFree(convertToYesNo(formData.claim_threshold));
        setHasDebt(convertToYesNo(formData.help_debt));
        setSignatureTfn(formData.signature || "");

        if (formData.dob) {
          setTfnDobBackend(formData.dob);
          setTfnDob(formatDateToDDMMYYYY(formData.dob));
        }
        if (formData.signed_date) {
          setDateTfnBackend(formData.signed_date);
          setDateTfn(formatDateToDDMMYYYY(formData.signed_date));
        }
      }

      // ================= SUPER =================
      else if (activeStaffTab === "super") {
        setSuperFullName(formData.full_name || "");
        setSuperEmployeeNumber(formData.employee_number || "");
        setFundChoice(formData.fund_choice || "employer");
        setSuperFundName(formData.fund_name || "");
        setSuperFundAbn(formData.fund_abn || "");
        setSuperFundUsi(formData.fund_usi || "");
        setSuperMemberNumber(formData.member_account || "");
        setSignatureSuper(formData.signature || "");
        setSuperConfirmation(
          formData.super_confirm === 1 || formData.super_confirm === true,
        );

        if (formData.signed_date) {
          setDateSuperBackend(formData.signed_date);
          setDateSuper(formatDateToDDMMYYYY(formData.signed_date));
        }
      }

      // ================= ONBOARDING =================
      else if (activeStaffTab === "onboarding") {
        setOnboardTfn(formData.tfn || "");
        setOnboardSuperFundName(formData.super_fund || "");
        setOnboardSuperUsi(formData.super_usi || "");
        setOnboardMemberNumber(formData.super_member || "");
        setOnboardFullName(formData.full_name || "");
        setOnboardMobile(formData.mobile || "");
        setOnboardEmail(formData.email || "");
        setOnboardAddress(formData.address || "");
        setPassportNumber(formData.passport_number || "");
        setPassportCountry(formData.passport_country || "Australia");

        if (formData.dob) {
          setOnboardDobBackend(formData.dob);
          setOnboardDob(formatDateToDDMMYYYY(formData.dob));
        }

        if (formData.work_rights) {
          const standard = ["citizen", "student", "temporary"];
          if (standard.includes(formData.work_rights)) {
            setWorkRights(formData.work_rights);
          } else {
            setWorkRights("other");
            setOtherVisaType(formData.work_rights);
          }
        }

        let checks = formData.id_checks;
        if (typeof checks === "string") {
          try {
            checks = JSON.parse(checks);
          } catch {
            checks = {};
          }
        }

        setIdChecks({
          primary_id: !!checks?.primary_id,
          drivers_license: !!checks?.drivers_license,
          security_license: !!checks?.security_license,
          medicare_or_utility: !!checks?.medicare_or_utility,
        });

        setResidentialStatus(formData.residential_status || "");
        setBankName(formData.bank_name || "");
        setBsb(formData.bsb || "");
        setAccountNumber(formData.account_number || "");

        // ── Security Licence: restore + lock if expiry already exists ──────
        const savedLicence = formData.security_license || "";
        const savedSecurityExpiry = formData.security_license_expiry || "";

        setSecurityLicence(savedLicence);

        if (savedSecurityExpiry) {
          setSecurityExpiryBackend(savedSecurityExpiry);
          setSecurityExpiry(formatDateToDDMMYYYY(savedSecurityExpiry));
          // If both licence and expiry exist from server, treat as already verified
          // so the expiry field stays locked (matches documents page behaviour)
          if (savedLicence) {
            setIsSecurityVerified(true);
          }
        } else {
          setSecurityExpiry("");
          setSecurityExpiryBackend("");
          setIsSecurityVerified(false);
        }

        setFirstAidNumber(formData.first_aid_cert || "");
        setSignatureOnboard(formData.signature || "");

        if (formData.signed_date) {
          setDateOnboardBackend(formData.signed_date);
          setDateOnboard(formatDateToDDMMYYYY(formData.signed_date));
        }
        if (formData.passport_expiry) {
          setPassportExpiryBackend(formData.passport_expiry);
          setPassportExpiry(formatDateToDDMMYYYY(formData.passport_expiry));
        }
        if (formData.first_aid_expiry) {
          setFirstAidExpiryBackend(formData.first_aid_expiry);
          setFirstAidExpiry(formatDateToDDMMYYYY(formData.first_aid_expiry));
        }

        setPassportDoc(formData.passport_doc || "");
        setSecurityLicenseDoc(formData.security_license_doc || "");
        setFirstAidDoc(formData.first_aid_doc || "");
      }
    } catch (error) {
      console.log(`Failed to fetch form data for ${activeStaffTab}:`, error);
    } finally {
      setTabLoading(false);
    }
  };

  const resetAllFields = () => {
    const currentTfnDob = tfnDob;
    const currentTfnDobBackend = tfnDobBackend;
    const currentOnboardDob = onboardDob;
    const currentOnboardDobBackend = onboardDobBackend;

    setTfnNumber("");
    setSignatureTfn("");
    setSuperFundName("");
    setSuperFundAbn("");
    setSuperFundUsi("");
    setSuperMemberNumber("");
    setSignatureSuper("");
    setPassportNumber("");
    setBankName("");
    setBsb("");
    setAccountNumber("");
    setSecurityLicence("");
    setFirstAidNumber("");
    setSignatureOnboard("");
    setPassportDoc("");
    setSecurityLicenseDoc("");
    setFirstAidDoc("");

    // Reset verification state on tab switch / reload
    setIsSecurityVerified(false);
    setSecurityExpiry("");
    setSecurityExpiryBackend("");

    setDateTfn("");
    setDateTfnBackend("");
    setDateSuper("");
    setDateSuperBackend("");
    setDateOnboard("");
    setDateOnboardBackend("");
    setPassportExpiry("");
    setPassportExpiryBackend("");
    setFirstAidExpiry("");
    setFirstAidExpiryBackend("");

    if (currentTfnDob) {
      setTfnDob(currentTfnDob);
      setTfnDobBackend(currentTfnDobBackend);
    }
    if (currentOnboardDob) {
      setOnboardDob(currentOnboardDob);
      setOnboardDobBackend(currentOnboardDobBackend);
    }
  };

  const formatDateSafe = (date: any, fieldName: string) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleSave = async () => {
    if (!userId || !activeStaffTab) return;

    if (!isFormComplete(activeStaffTab)) {
      Toast.show({
        type: "error",
        text1: "Incomplete Form",
        text2: "Please complete all required (*) fields.",
        position: "top",
      });
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      if (activeStaffTab === "tfn") {
        const tfnPayload = {
          user_id: userId,
          tfn: tfnNumber,
          title: tfnTitle,
          first_name: tfnFirstName,
          surname: tfnSurname,
          previous_name: tfnPrevName,
          dob: tfnDobBackend,
          address: tfnAddress,
          basis_of_payment: basisOfPayment,
          australian_resident: australianResident,
          claim_threshold: claimTaxFree,
          help_debt: hasDebt,
          signature: signatureTfn,
          date: dateTfnBackend,
        };
        await axios.post(`${BASE_URL}/api/tfn-declaration`, tfnPayload, {
          headers,
        });
      } else if (activeStaffTab === "super") {
        const superPayload = {
          user_id: userId,
          full_name: superFullName || autoFullName,
          employee_number: superEmployeeNumber,
          fund_choice: fundChoice,
          fund_name: fundChoice === "own" ? superFundName : "",
          fund_abn: fundChoice === "own" ? superFundAbn : "",
          fund_usi: fundChoice === "own" ? superFundUsi : "",
          member_account: fundChoice === "own" ? superMemberNumber : "",
          signature: signatureSuper,
          date: dateSuperBackend,
          super_confirm: superConfirmation ? 1 : 0,
        };
        await axios.post(`${BASE_URL}/api/superannuation`, superPayload, {
          headers,
        });
      } else if (activeStaffTab === "onboarding") {
        const onboardingPayload = {
          user_id: userId,
          full_name: onboardFullName || autoFullName,
          dob: formatDateSafe(onboardDobBackend, "dob"),
          residential_status: residentialStatus,
          address: onboardAddress,
          mobile: onboardMobile,
          email: onboardEmail,
          passport_number: passportNumber,
          passport_country: passportCountry,
          passport_expiry: formatDateSafe(
            passportExpiryBackend,
            "passport_expiry",
          ),
          work_rights: workRights === "other" ? otherVisaType : workRights,
          tfn: onboardTfn,
          super_fund: onboardSuperFundName,
          super_usi: onboardSuperUsi,
          super_member: onboardMemberNumber,
          id_checks: {
            primary_id: idChecks.primary_id,
            drivers_license: idChecks.drivers_license,
            security_license: idChecks.security_license,
            medicare_or_utility: idChecks.medicare_or_utility,
          },
          bank_name: bankName,
          bsb: bsb,
          account_number: accountNumber,
          security_license: securityLicence,
          security_license_expiry: formatDateSafe(
            securityExpiryBackend,
            "security_license_expiry",
          ),
          first_aid_cert: firstAidNumber,
          first_aid_expiry: formatDateSafe(
            firstAidExpiryBackend,
            "first_aid_expiry",
          ),
          passport_doc: passportDoc,
          security_license_doc: securityLicenseDoc,
          first_aid_doc: firstAidDoc,
          signature: signatureOnboard,
          date: formatDateSafe(dateOnboardBackend, "date"),
        };

        console.log(onboardingPayload, "Onboarding Payload");
        await axios.post(`${BASE_URL}/api/onboarding`, onboardingPayload, {
          headers,
        });
      }

      Toast.show({ type: "success", text1: "✓ Form saved successfully!" });

      const pdfType =
        activeStaffTab === "super" ? "super_form" : activeStaffTab;
      await generateUploadAndOpenPdf(
        pdfType as "tfn" | "super_form" | "onboarding",
      );

      await fetchFormData(userId);
    } catch (err: any) {
      console.error("❌ Save/Upload Flow Error:", err);
      Toast.show({
        type: "error",
        text1: "Save or Upload Failed",
        text2:
          err?.response?.data?.message ||
          "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete = (tab: StaffTab): boolean => {
    if (tab === "tfn") {
      return !!(
        tfnNumber &&
        tfnTitle &&
        tfnFirstName &&
        tfnSurname &&
        tfnDobBackend &&
        tfnAddress &&
        basisOfPayment &&
        australianResident !== null &&
        claimTaxFree !== null &&
        hasDebt !== null &&
        signatureTfn
      );
    }
    if (tab === "super") {
      return !!(
        (superFullName || autoFullName) &&
        signatureSuper &&
        (fundChoice === "employer" ||
          (fundChoice === "own" &&
            superFundName &&
            superFundAbn &&
            superFundUsi &&
            superMemberNumber)) &&
        superConfirmation
      );
    }
    if (tab === "onboarding") {
      const isOtherVisaComplete =
        workRights === "other" ? !!otherVisaType.trim() : true;
      return !!(
        (onboardFullName || autoFullName) &&
        onboardDobBackend &&
        onboardAddress &&
        onboardMobile &&
        onboardEmail &&
        passportNumber &&
        passportCountry &&
        passportExpiryBackend &&
        workRights &&
        isOtherVisaComplete &&
        signatureOnboard &&
        bankName &&
        bsb &&
        accountNumber &&
        onboardTfn &&
        onboardSuperFundName &&
        onboardSuperUsi &&
        onboardMemberNumber &&
        securityLicence &&
        // Require expiry only if verified OR manually available
        securityExpiryBackend &&
        firstAidNumber &&
        firstAidExpiryBackend
      );
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  if (fetching) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={s.loadingText}>Loading Your Profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8faff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Staffoo Verification Forms</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        {[
          { key: "onboarding", label: "Employee Onboarding", Icon: BadgeCheck },
          { key: "tfn", label: "TFN Declaration", Icon: FileText },
          { key: "super", label: "Superannuation", Icon: Building2 },
        ].map((tab) => {
          const active = activeStaffTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabBtn, active && s.tabBtnActive]}
              onPress={() => setActiveStaffTab(tab.key as StaffTab)}
            >
              <tab.Icon size={18} color={active ? "#fff" : "#94A3B8"} />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* ── TFN TAB ── */}
        {activeStaffTab === "tfn" && (
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
              <View style={{ flex: 1 }}>
                <Field label="Title">
                  <TouchableOpacity
                    style={s.selectBtn}
                    onPress={() => setShowTitleModal(true)}
                  >
                    <Text
                      style={[s.selectText, !tfnTitle && { color: "#9CA3AF" }]}
                    >
                      {tfnTitle || "Mr/Ms"}
                    </Text>
                    <ChevronDown size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="First name">
                  <StyledInput
                    value={tfnFirstName}
                    onChangeText={setTfnFirstName}
                    placeholder="Jane"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
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
                    onPress={() => openDatePicker("tfnDob")}
                  />
                </Field>
              </View>
            </View>

            <SectionLabel>Residential Address</SectionLabel>
            <Field label="Residential Address">
              <StyledInput
                value={tfnAddress}
                editable={false}
                placeholder="Address not found in profile"
              />
            </Field>

            <SectionLabel>Employment</SectionLabel>
            <Field label="Employment Type">
              <RadioGroup
                options={[
                  { label: "Full-time", value: "full-time" },
                  { label: "Part-time", value: "part-time" },
                  { label: "Casual", value: "casual" },
                ]}
                value={basisOfPayment}
                onChange={setBasisOfPayment}
              />
            </Field>

            <SectionLabel>Declarations</SectionLabel>
            <Field label="Australian resident for tax?">
              <YesNoGroup
                value={australianResident}
                onChange={setAustralianResident}
              />
            </Field>
            <Field label="Claim tax-free threshold?">
              <YesNoGroup value={claimTaxFree} onChange={setClaimTaxFree} />
            </Field>
            <Field label="Have HELP / VSL / trade debt?">
              <YesNoGroup value={hasDebt} onChange={setHasDebt} />
            </Field>

            <SectionLabel>Signature & Date</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Signature">
                  <SignatureButton
                    value={signatureTfn}
                    onPress={() => openSignature("tfn")}
                    onClear={() => setSignatureTfn("")}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date">
                  <DateButton
                    value={dateTfn}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker("dateTfn")}
                  />
                </Field>
              </View>
            </View>

            <SaveButton
              label="Save TFN Declaration"
              loading={loading}
              disabled={!isFormComplete(activeStaffTab)}
              onPress={handleSave}
            />
          </View>
        )}

        {/* ── SUPER TAB ── */}
        {activeStaffTab === "super" && (
          <View style={s.card}>
            <SectionLabel>Employee Details</SectionLabel>
            <Field label="Full Name">
              <StyledInput
                value={superFullName}
                onChangeText={setSuperFullName}
                placeholder="Full Name"
              />
            </Field>
            <Field label="Employee number (if known)">
              <StyledInput
                value={superEmployeeNumber}
                onChangeText={setSuperEmployeeNumber}
                placeholder="Optional"
              />
            </Field>

            <SectionLabel>Fund Choice</SectionLabel>
            <RadioGroup
              options={[
                { label: "I nominate my own super fund", value: "own" },
                {
                  label: "Use the employer's default super fund",
                  value: "employer",
                },
              ]}
              value={fundChoice}
              onChange={(v: any) => setFundChoice(v)}
            />

            {fundChoice === "own" && (
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
                        placeholder="e.g. 12345678901001"
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Member account No.">
                      <StyledInput
                        value={superMemberNumber}
                        onChangeText={setSuperMemberNumber}
                        placeholder="Account Number"
                      />
                    </Field>
                  </View>
                </View>
              </View>
            )}

            <SectionLabel>Signature & Date</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Signature">
                  <SignatureButton
                    value={signatureSuper}
                    onPress={() => openSignature("super")}
                    onClear={() => setSignatureSuper("")}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date">
                  <DateButton
                    value={dateSuper}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker("dateSuper")}
                  />
                </Field>
              </View>
            </View>

            <Field label="Confirmation">
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 10,
                }}
                onPress={() => setSuperConfirmation(!superConfirmation)}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderWidth: 1,
                    borderColor: "#94A3B8",
                    marginRight: 10,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: superConfirmation
                      ? "#2563EB"
                      : "transparent",
                  }}
                >
                  {superConfirmation && (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: "bold",
                      }}
                    >
                      ✓
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize: 12, flex: 1, color: "#989696" }}>
                  I confirm that the superannuation fund details provided are
                  correct. I understand my super contributions will be paid into
                  the fund I have selected above.
                </Text>
              </TouchableOpacity>
            </Field>

            <SaveButton
              label="Save Superannuation"
              loading={loading}
              disabled={!isFormComplete(activeStaffTab)}
              onPress={handleSave}
            />
          </View>
        )}

        {/* ── ONBOARDING TAB ── */}
        {activeStaffTab === "onboarding" && (
          <View style={s.card}>
            <SectionLabel>1. Contact Info</SectionLabel>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Full Name (As per ID)">
                  <StyledInput
                    value={onboardFullName}
                    onChangeText={setOnboardFullName}
                    placeholder="Full Name"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Mobile Number">
                  <StyledInput
                    value={onboardMobile}
                    onChangeText={setOnboardMobile}
                    placeholder="0400 000 000"
                    keyboardType="phone-pad"
                  />
                </Field>
              </View>
            </View>

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Email Address">
                  <StyledInput
                    value={onboardEmail}
                    editable={false}
                    placeholder="name@domain.com"
                  />
                </Field>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Field label="Date of birth">
                <DateButton
                  value={onboardDob}
                  placeholder="dd/mm/yyyy"
                  onPress={() => openDatePicker("onboardDob")}
                />
              </Field>
            </View>

            <SectionLabel>Residential Details</SectionLabel>
            <Field label="Residential Address">
              <StyledInput
                value={onboardAddress}
                editable={false}
                placeholder="Address not found in profile"
              />
            </Field>

            <SectionLabel>2. Passport & Work Rights</SectionLabel>
            <View style={s.row3}>
              <View style={{ flex: 1 }}>
                <Field label="Passport Number">
                  <StyledInput
                    value={passportNumber}
                    onChangeText={setPassportNumber}
                    placeholder="N1234567"
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
            <View style={{ flex: 1 }}>
              <Field label="Passport Expiry">
                <DateButton
                  value={passportExpiry}
                  placeholder="dd/mm/yyyy"
                  onPress={() => openDatePicker("passportExp")}
                />
              </Field>
            </View>

            <DocUploadField
              label="Upload Passport Document"
              required
              fileName={passportDocName}
              uploading={passportDocUploading}
              storedName={passportDoc}
              onPick={() =>
                uploadDocumentFile(
                  setPassportDocUploading,
                  setPassportDocName,
                  setPassportDoc,
                )
              }
              onView={() => openDocument(passportDoc)}
              onClear={() => {
                setPassportDoc("");
                setPassportDocName("");
              }}
            />

            <Field label="Work Rights In Australia">
              <RadioGroup
                options={[
                  {
                    label: "Australian Citizen / Permanent Resident",
                    value: "citizen",
                  },
                  { label: "Student Visa", value: "student" },
                  { label: "Temporary Visa Holder", value: "temporary" },
                  { label: "Other Visa (please specify)", value: "other" },
                ]}
                value={workRights}
                onChange={setWorkRights}
              />
            </Field>

            {workRights === "other" && (
              <Field label="Visa Type">
                <StyledInput
                  value={otherVisaType}
                  onChangeText={setOtherVisaType}
                  placeholder="Specify your visa type"
                />
              </Field>
            )}

            <SectionLabel>3. 100-Point Identification Check</SectionLabel>
            <View style={s.idTable}>
              <IdCheckRow
                label="Birth Certificate, Passport, or Citizenship Certificate - 70 Points"
                checked={idChecks.primary_id}
                onPress={() =>
                  setIdChecks((p) => ({ ...p, primary_id: !p.primary_id }))
                }
              />
              <IdCheckRow
                label="Driver Licence or Government Issued Photo ID - 40 Points"
                checked={idChecks.drivers_license}
                onPress={() =>
                  setIdChecks((p) => ({
                    ...p,
                    drivers_license: !p.drivers_license,
                  }))
                }
              />
              <IdCheckRow
                label="Security Licence (Mandatory) - 40 Points"
                checked={idChecks.security_license}
                onPress={() =>
                  setIdChecks((p) => ({
                    ...p,
                    security_license: !p.security_license,
                  }))
                }
              />
              <IdCheckRow
                label="Medicare Card, Utility Bill, or Bank Statement - 25 Points"
                checked={idChecks.medicare_or_utility}
                onPress={() =>
                  setIdChecks((p) => ({
                    ...p,
                    medicare_or_utility: !p.medicare_or_utility,
                  }))
                }
              />
            </View>

            <SectionLabel>4. Bank Details</SectionLabel>
            <Field label="Bank Name">
              <StyledInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. CommBank"
              />
            </Field>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="BSB">
                  <StyledInput
                    value={bsb}
                    onChangeText={setBsb}
                    placeholder="000-000"
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Account Number">
                  <StyledInput
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="1234 5678"
                    keyboardType="numeric"
                  />
                </Field>
              </View>
            </View>

            <SectionLabel>5. Tax & Superannuation Details</SectionLabel>
            <Field label="Tax File Number (TFN)">
              <StyledInput
                value={onboardTfn}
                onChangeText={setOnboardTfn}
                placeholder="000 000 000"
                keyboardType="numeric"
                maxLength={11}
              />
            </Field>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Super Fund Name">
                  <StyledInput
                    value={onboardSuperFundName}
                    onChangeText={setOnboardSuperFundName}
                    placeholder="e.g. AustralianSuper"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Super USI">
                  <StyledInput
                    value={onboardSuperUsi}
                    onChangeText={setOnboardSuperUsi}
                    placeholder="123456789012345"
                  />
                </Field>
              </View>
            </View>
            <Field label="Member Number">
              <StyledInput
                value={onboardMemberNumber}
                onChangeText={setOnboardMemberNumber}
                placeholder="Member Account Number"
              />
            </Field>

            {/* ── Section 6: Licences ──────────────────────────────────────── */}
            <SectionLabel>6. License & Certs</SectionLabel>

            {/*
             * SECURITY LICENCE — verify-then-lock pattern
             * ─────────────────────────────────────────────────────────────────
             * 1. User types the licence number.
             * 2. Tapping "Verify" calls the documents-online-verification API.
             * 3. On success the expiry date is auto-filled and the expiry field
             *    is locked (disabled + lock icon), identical to the Documents page.
             * 4. If the user edits the licence number after a successful
             *    verification, the verified state resets and the expiry clears
             *    so they must re-verify.
             * 5. When loading saved data from the server, if both a licence
             *    number and an expiry already exist, the expiry field is locked
             *    automatically (same as if just verified).
             */}
            <View style={{ flex: 1 }}>
              <Field label="Security licence No.">
                <View
                  style={[
                    s.secVerifyRow,
                    isSecurityVerified && s.secVerifyRowVerified,
                  ]}
                >
                  <TextInput
                    style={s.secVerifyInput}
                    value={securityLicence}
                    onChangeText={(text: string) => {
                      // Reset verification whenever the licence number changes
                      setSecurityLicence(text.toUpperCase());
                      if (isSecurityVerified) {
                        setIsSecurityVerified(false);
                        setSecurityExpiry("");
                        setSecurityExpiryBackend("");
                      }
                    }}
                    placeholder="VIC 123456"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    autoCorrect={false}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[
                      s.secVerifyBtn,
                      verifyingSecurity && { opacity: 0.7 },
                    ]}
                    disabled={verifyingSecurity}
                    onPress={handleVerifySecurityLicence}
                  >
                    {verifyingSecurity ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.secVerifyBtnText}>
                        {isSecurityVerified ? "Re-verify" : "Verify"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Field>
            </View>

            {/* Security Licence Expiry — locked after verification */}
            <View style={{ flex: 1 }}>
              <Field label="Security Licence Expiry">
                <TouchableOpacity
                  style={[s.dateBtn, isSecurityVerified && s.dateBtnLocked]}
                  // Disabled when verified — expiry is auto-filled & locked
                  disabled={isSecurityVerified}
                  onPress={() => {
                    if (!isSecurityVerified) openDatePicker("secExp");
                  }}
                  activeOpacity={isSecurityVerified ? 1 : 0.7}
                >
                  <Text
                    style={[
                      s.dateBtnText,
                      !securityExpiry && { color: "rgba(255,255,255,0.4)" },
                      isSecurityVerified && { color: BRAND },
                    ]}
                  >
                    {securityExpiry || "dd/mm/yyyy"}
                  </Text>
                  {isSecurityVerified && (
                    <Lock size={16} color={BRAND} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              </Field>
            </View>

            {/* Verification status message */}
            {isSecurityVerified && (
              <View style={s.secVerifiedBadge}>
                <Check size={14} color={BRAND_DARK} />
                <Text style={s.secVerifiedBadgeText}>
                  Verified — expiry auto-filled and locked
                </Text>
              </View>
            )}

            <DocUploadField
              label="Upload Security Licence Document"
              required
              fileName={securityLicenseDocName}
              uploading={securityLicenseDocUploading}
              storedName={securityLicenseDoc}
              onPick={() =>
                uploadDocumentFile(
                  setSecurityLicenseDocUploading,
                  setSecurityLicenseDocName,
                  setSecurityLicenseDoc,
                )
              }
              onView={() => openDocument(securityLicenseDoc)}
              onClear={() => {
                setSecurityLicenseDoc("");
                setSecurityLicenseDocName("");
              }}
            />

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="First Aid Certificate No.">
                  <StyledInput
                    value={firstAidNumber}
                    onChangeText={setFirstAidNumber}
                    placeholder="FA-001234"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="First Aid Expiry">
                  <DateButton
                    value={firstAidExpiry}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker("faExp")}
                  />
                </Field>
              </View>
            </View>

            <DocUploadField
              label="Upload First Aid Document"
              required
              fileName={firstAidDocName}
              uploading={firstAidDocUploading}
              storedName={firstAidDoc}
              onPick={() =>
                uploadDocumentFile(
                  setFirstAidDocUploading,
                  setFirstAidDocName,
                  setFirstAidDoc,
                )
              }
              onView={() => openDocument(firstAidDoc)}
              onClear={() => {
                setFirstAidDoc("");
                setFirstAidDocName("");
              }}
            />

            <SectionLabel>Declaration & Signature</SectionLabel>
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Employee signature">
                  <SignatureButton
                    value={signatureOnboard}
                    onPress={() => openSignature("onboard")}
                    onClear={() => setSignatureOnboard("")}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Date">
                  <DateButton
                    value={dateOnboard}
                    placeholder="dd/mm/yyyy"
                    onPress={() => openDatePicker("dateOnboard")}
                  />
                </Field>
              </View>
            </View>

            <SaveButton
              label="Save Onboarding Form"
              loading={loading}
              disabled={!isFormComplete(activeStaffTab)}
              onPress={handleSave}
            />
          </View>
        )}
      </ScrollView>

      {/* Date Picker Overlay */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          textColor="#fff"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      )}

      {/* ── Signature Modal ── */}
      <Modal visible={showSignatureModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
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
              onOK={(sig) => handleSaveSignature(sig)}
              onEmpty={() =>
                Toast.show({ type: "error", text1: "Please draw a signature" })
              }
              autoClear={false}
              descriptionText=""
              clearText="Clear"
              confirmText="Save Signature"
              webStyle={`
                * { box-sizing: border-box; }
                html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #fafafa; }
                .m-signature-pad { position: absolute; inset: 0; box-shadow: none; border: none; background: #fafafa; }
                .m-signature-pad--body { position: absolute; top: 12px; left: 12px; right: 12px; bottom: 70px; border: 2px dashed #CBD5E1; border-radius: 12px; background: #fff; }
                canvas { width: 100% !important; height: 100% !important; border-radius: 12px; }
                .m-signature-pad--footer { position: absolute; bottom: 0; left: 0; right: 0; height: 70px; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #fff; border-top: 1px solid #e2e8f0; }
                .m-signature-pad--footer .button { border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; border: none; }
                .m-signature-pad--footer .button.clear { background: #fef2f2; color: #ef4444; }
                .m-signature-pad--footer .button.save  { background: #2EB1E2; color: #fff; }
              `}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Title Options Modal */}
      <Modal visible={showTitleModal} transparent animationType="fade">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTitleModal(false)}
        >
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Select Title</Text>
            {titleOptions.map((t) => (
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
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ══════════════════ Reusable Form Components ══════════════════
const SectionLabel = ({ children }: { children: string }) => (
  <View style={s.sectionLabelWrap}>
    <Text style={s.sectionLabelText}>{children}</Text>
  </View>
);

const Field = ({ label, children }: { label: string; children: any }) => (
  <View style={s.fieldWrapper}>
    <Text style={s.label}>
      {label} <Text style={{ color: "red" }}>*</Text>
    </Text>
    {children}
  </View>
);

const StyledInput = (props: any) => (
  <TextInput
    style={s.input}
    placeholderTextColor="rgba(255,255,255,0.4)"
    autoCorrect={false}
    {...props}
  />
);

const DateButton = ({ value, placeholder, onPress }: any) => (
  <TouchableOpacity style={s.dateBtn} onPress={onPress}>
    <Text style={[s.dateBtnText, !value && { color: "rgba(255,255,255,0.4)" }]}>
      {value || placeholder}
    </Text>
  </TouchableOpacity>
);

const SignatureButton = ({ value, onPress, onClear }: any) => (
  <View style={s.sigContainer}>
    {value ? (
      <View style={s.sigUploadedBox}>
        <Text style={s.sigUploadedText}>✓ Signature Added</Text>
        <TouchableOpacity onPress={onClear} style={s.sigClearBtn}>
          <X size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity style={s.sigPlaceholderBtn} onPress={onPress}>
        <Text style={s.sigPlaceholderText}>Tap to add signature</Text>
      </TouchableOpacity>
    )}
  </View>
);

const SaveButton = ({ label, loading, onPress, disabled }: any) => (
  <TouchableOpacity
    style={[s.saveBtn, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={loading || disabled}
  >
    {loading ? (
      <ActivityIndicator size="small" color={BRAND_DARK} />
    ) : (
      <Text style={s.saveBtnText}>{label}</Text>
    )}
  </TouchableOpacity>
);

const IdCheckRow = ({ label, checked, onPress }: any) => (
  <TouchableOpacity style={s.idRow} onPress={onPress}>
    <Text style={s.idRowText}>{label}</Text>
    <View style={[s.idCheckCircle, checked && s.idCheckCircleOn]}>
      {checked && <Check size={12} color={BRAND_DARK} />}
    </View>
  </TouchableOpacity>
);

const RadioGroup = ({ options, value, onChange }: any) => (
  <View style={s.radioGroup}>
    {options.map((opt: any) => (
      <TouchableOpacity
        key={opt.value}
        style={s.radioOpt}
        onPress={() => onChange(opt.value)}
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

const YesNoGroup = ({ value, onChange }: any) => (
  <View style={s.yesNoRow}>
    {["yes", "no"].map((opt) => (
      <TouchableOpacity
        key={opt}
        style={[s.yesNoBtn, value === opt && s.yesNoBtnOn]}
        onPress={() => onChange(opt)}
      >
        <Text style={[s.yesNoText, value === opt && s.yesNoTextOn]}>
          {opt.toUpperCase()}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const DocUploadField = ({
  label,
  required,
  fileName,
  uploading,
  storedName,
  onPick,
  onView,
  onClear,
}: {
  label: string;
  required?: boolean;
  fileName: string;
  uploading: boolean;
  storedName: string;
  onPick: () => void;
  onView: () => void;
  onClear: () => void;
}) => (
  <View style={s.fieldWrap}>
    <Text style={s.fieldLabel}>
      {label}
      {required && <Text style={{ color: ERROR }}> *</Text>}
    </Text>
    <View style={s.docUploadRow}>
      <TouchableOpacity
        style={s.docPickBtn}
        onPress={onPick}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={BRAND_DARK} />
        ) : (
          <Text style={s.docPickBtnText}>Choose File</Text>
        )}
      </TouchableOpacity>
      <Text style={s.docFileName} numberOfLines={1} ellipsizeMode="middle">
        {fileName || "No file chosen"}
      </Text>
      {storedName ? (
        <TouchableOpacity onPress={onClear} style={s.docClearBtn}>
          <X size={14} color={ERROR} />
        </TouchableOpacity>
      ) : null}
    </View>
    {storedName ? (
      <TouchableOpacity style={s.docViewBtn} onPress={onView}>
        <FileText size={14} color={BRAND} />
        <Text style={s.docViewBtnText}>View Attached Document</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111111", paddingTop: 25 },
  fieldWrapper: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: "600", color: "#929294", marginBottom: 5 },
  asterisk: { color: "#EF4444", fontWeight: "bold" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#fff", fontSize: 14 },
  header: {
    height: 56,
    backgroundColor: BRAND_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: BRAND_LIGHT,
    padding: 4,
    borderRadius: 8,
    marginHorizontal: 10,
    marginTop: 5,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  suggestionsContainer: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 12,
    maxHeight: 220,
    overflow: "hidden",
    zIndex: 10,
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  suggestionText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  tabItemActive: { backgroundColor: BRAND },
  tabText: { fontSize: 11, fontWeight: "600", color: "#94A3B8" },
  tabTextActive: { color: BRAND_DARK },
  scrollContent: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(137, 231, 208, 0.1)",
  },
  sectionLabelWrap: {
    marginTop: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
    paddingLeft: 8,
  },
  sectionLabelText: {
    color: BRAND,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#fff",
  },
  row2: { flexDirection: "row", gap: 10 },
  row3: { flexDirection: "row", gap: 8 },
  selectBtn: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: { color: "#fff", fontSize: 14 },
  dateBtn: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Locked state for verified expiry date field
  dateBtnLocked: {
    borderColor: BRAND,
    backgroundColor: "rgba(137,231,208,0.08)",
  },
  dateBtnText: { color: "#fff", fontSize: 14 },
  sigContainer: { height: 44, justifyContent: "center" },
  sigPlaceholderBtn: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: BRAND,
    borderRadius: 10,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  sigPlaceholderText: { color: BRAND, fontSize: 13, fontWeight: "600" },
  sigUploadedBox: {
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 10,
    height: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  sigUploadedText: { color: BRAND, fontSize: 13, fontWeight: "600" },
  sigClearBtn: { padding: 4 },
  saveBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { color: BRAND_DARK, fontSize: 15, fontWeight: "700" },
  downloadBtn: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  downloadBtnText: { fontSize: 14, fontWeight: "700" },
  ownFundBox: {
    backgroundColor: "rgba(0,0,0,0.15)",
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#475569",
  },
  radioGroup: { gap: 8, marginVertical: 4 },
  radioOpt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleOn: { borderColor: BRAND },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
  radioLabel: { color: "#94A3B8", fontSize: 13 },
  radioLabelOn: { color: "#fff" },
  yesNoRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  yesNoBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  yesNoBtnOn: {
    backgroundColor: "rgba(137, 231, 208, 0.15)",
    borderColor: BRAND,
  },
  yesNoText: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  yesNoTextOn: { color: BRAND },
  idTable: {
    borderWidth: 1,
    borderColor: "rgba(137, 231, 208, 0.2)",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  idRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: BRAND_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(137, 231, 208, 0.1)",
  },
  idRowText: { color: "#94A3B8", fontSize: 10 },
  idCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  idCheckCircleOn: { backgroundColor: BRAND, borderColor: BRAND },
  sigModalHeader: {
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 31, 63, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 30,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#475569",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalSheetTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  modalOptionActive: { opacity: 0.8 },
  modalOptionText: { color: "#94A3B8", fontSize: 15 },
  modalOptionTextActive: { color: BRAND, fontWeight: "600" },
  sigCancelBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sigCancelText: { color: ERROR, fontSize: 15, fontWeight: "600" },
  sigModalTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  sigHint: {
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(137, 231, 208, 0.2)",
  },
  sigHintText: { fontSize: 12, color: "#94A3B8", textAlign: "center" },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    padding: 7,
    borderRadius: 8,
    backgroundColor: BRAND_LIGHT,
  },
  tabBtnActive: {
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", marginTop: 4 },
  tabLabelActive: { color: BRAND_DARK, fontWeight: "700" },
  docUploadRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    overflow: "hidden",
  },
  docPickBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  docPickBtnText: { color: BRAND_DARK, fontSize: 13, fontWeight: "700" },
  docFileName: { flex: 1, color: "#fff", fontSize: 12, paddingHorizontal: 10 },
  docClearBtn: { padding: 10 },
  docViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
  },
  docViewBtnText: {
    color: BRAND,
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // ── Security Licence Verify-Row Styles ─────────────────────────────────────
  secVerifyRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 10,
    overflow: "hidden",
  },
  // Border turns mint-green when verified
  secVerifyRowVerified: {
    borderColor: BRAND,
  },
  secVerifyInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#fff",
  },
  secVerifyBtn: {
    backgroundColor: "#366bf0",
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
    minHeight: 44,
  },
  secVerifyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Verified badge shown below the expiry field
  secVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 4,
    alignSelf: "flex-start",
    gap: 6,
  },
  secVerifiedBadgeText: {
    color: BRAND_DARK,
    fontSize: 12,
    fontWeight: "700",
  },
});

export default StaffFormsScreen;
