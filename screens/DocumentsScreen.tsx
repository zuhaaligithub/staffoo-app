// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   Modal,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   StyleSheet,
//   SafeAreaView,
//   StatusBar,
//   Dimensions,
//   Image,
//   ActivityIndicator,
//   FlatList,
//   Linking,
//   Platform,
// } from "react-native";
// import {
//   ArrowLeft,
//   X,
//   FileText,
//   CloudUpload,
//   ExternalLink,
//   Eye,
//   PlusCircle,
//   Lock,
//   Pencil,
//   CalendarDays,
// } from "lucide-react-native";
// import Toast from "react-native-toast-message";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import { BASE_URL, getUserProfile, uploadFile } from "../services/authApi";
// import { launchImageLibrary } from "react-native-image-picker";
// import LinearGradient from "react-native-linear-gradient";
// import DateTimePicker from "@react-native-community/datetimepicker";

// const { width } = Dimensions.get("window");

// // const FILE_BASE_URL = "https://apis.staffoo.com.au/staff_documents/";
// const FILE_BASE_URL = "https://staging.apis.staffoo.com.au/staff_documents/";
// const Api_Url = "https://apis.thescouts.com.au/api";

// type Props = { navigation: any };

// type Document = {
//   id: number;
//   document_name: string;
//   document_no?: string;
//   document_expiry?: string;
//   file?: string;
//   document_type: string;
//   document_category?: string;
// };

// const THEME = {
//   background: "#111111",
//   cardBg: "#1C2541",
//   accent: "#366bf0",
//   teal: "#89E7D0",
//   textLight: "#FFFFFF",
//   textMuted: "#6C7A89",
//   border: "rgba(255, 255, 255, 0.1)",
// };

// const MAX_FILE_SIZE = 5 * 1024 * 1024;
// const DOC_NO_MAX = 20;

// const ALLOWED_FILE_TYPES = [
//   "image/jpeg",
//   "image/png",
//   "image/jpg",
//   "application/pdf",
//   "application/msword",
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
// ];

// // STRICT: ONLY these exact document names will show the verify button
// const VERIFIABLE_DOCUMENT_NAMES = ["visa", "security license"];

// // ─── Country name -> ISO3 code map (extend as needed) ────────────────────────
// const COUNTRY_TO_ISO3: Record<string, string> = {
//   pakistan: "PAK",
//   australia: "AUS",
//   india: "IND",
//   bangladesh: "BGD",
//   "united kingdom": "GBR",
//   "united states": "USA",
//   philippines: "PHL",
//   nepal: "NPL",
//   "sri lanka": "LKA",
//   china: "CHN",
//   malaysia: "MYS",
//   indonesia: "IDN",
//   "new zealand": "NZL",
//   canada: "CAN",
//   "south africa": "ZAF",
//   nigeria: "NGA",
//   vietnam: "VNM",
//   thailand: "THA",
// };

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// const isImageFile = (
//   fileStr?: string | null,
//   mimeType?: string | null,
// ): boolean => {
//   if (!fileStr && !mimeType) return false;
//   if (mimeType && mimeType.startsWith("image/")) return true;
//   if (!fileStr) return false;
//   return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileStr);
// };

// const getFileUrl = (file?: string | null): string | null => {
//   if (!file) return null;
//   if (file.startsWith("http") || file.startsWith("file://")) return file;
//   return `${FILE_BASE_URL}${file}`;
// };

// const getExpiryStatus = (
//   expiryStr?: string,
// ): "expired" | "expiring_soon" | "ok" | "none" => {
//   if (!expiryStr) return "none";
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   const expiry = new Date(expiryStr);
//   expiry.setHours(0, 0, 0, 0);
//   const diffDays = Math.ceil(
//     (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
//   );
//   if (diffDays < 0) return "expired";
//   if (diffDays <= 30) return "expiring_soon";
//   return "ok";
// };

// // Formats string timeline keys (YYYY-MM-DD) or Date entities directly into Australian Syntax (DD/MM/YYYY)
// const formatAUDate = (dateSource?: string | Date | null): string => {
//   if (!dateSource) return "—";

//   if (dateSource instanceof Date) {
//     const day = String(dateSource.getDate()).padStart(2, "0");
//     const month = String(dateSource.getMonth() + 1).padStart(2, "0");
//     const year = dateSource.getFullYear();
//     return `${day}/${month}/${year}`;
//   }

//   const [year, month, day] = dateSource.split("-");
//   if (!year || !month || !day) return dateSource;
//   return `${day}/${month}/${year}`;
// };

// // STRICT CHECK: ONLY returns true for documents named "Visa" or "Security License"
// const isVerifiableDocType = (opts: {
//   label?: string | null;
//   value?: string | null;
//   category?: string | null;
// }): boolean => {
//   const docName = (opts.label || opts.value || "").toLowerCase().trim();

//   const isVerifiable = VERIFIABLE_DOCUMENT_NAMES.some(
//     (keyword) => docName === keyword || docName.includes(keyword),
//   );

//   console.log(
//     `[VERIFY CHECK] Document: "${docName}", Verifiable: ${isVerifiable}`,
//   );
//   return isVerifiable;
// };

// // Parses an expiry date that may come back as DD/MM/YYYY or YYYY-MM-DD
// const parseApiExpiryDate = (value: string): Date | null => {
//   if (!value) return null;

//   // DD/MM/YYYY
//   const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
//   if (ddmmyyyy) {
//     const [, dd, mm, yyyy] = ddmmyyyy;
//     const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//     return isNaN(d.getTime()) ? null : d;
//   }

//   // YYYY-MM-DD
//   const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//   if (yyyymmdd) {
//     const [, yyyy, mm, dd] = yyyymmdd;
//     const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//     return isNaN(d.getTime()) ? null : d;
//   }

//   // Fallback - let Date try
//   const d = new Date(value);
//   return isNaN(d.getTime()) ? null : d;
// };

// // Maps a full country name to an ISO3 code (falls back to uppercased input)
// const getCountryCode = (countryName?: string | null): string => {
//   if (!countryName) return "";
//   const key = countryName.toLowerCase().trim();
//   return COUNTRY_TO_ISO3[key] || countryName.toUpperCase();
// };

// const splitName = (
//   fullName?: string | null,
// ): { given_name: string; family_name: string } => {
//   if (!fullName) return { given_name: "", family_name: "" };

//   const firstName = fullName.trim().split(/\s+/)[0];

//   return {
//     given_name: firstName,
//     family_name: firstName,
//   };
// };

// // Normalises a date-of-birth value (handles DD/MM/YYYY or YYYY-MM-DD) into YYYY-MM-DD
// const normalizeDobToISO = (value?: string | null): string => {
//   if (!value) return "";

//   const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//   if (yyyymmdd) {
//     const [, yyyy, mm, dd] = yyyymmdd;
//     return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
//   }

//   const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
//   if (ddmmyyyy) {
//     const [, dd, mm, yyyy] = ddmmyyyy;
//     return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
//   }

//   const d = new Date(value);
//   if (!isNaN(d.getTime())) {
//     const yyyy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, "0");
//     const dd = String(d.getDate()).padStart(2, "0");
//     return `${yyyy}-${mm}-${dd}`;
//   }

//   return "";
// };

// // ─── LazyImage ───────────────────────────────────────────────────────────────

// const LazyImage = ({ uri, style }: { uri: string; style: any }) => {
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(false);

//   return (
//     <View style={[style, { justifyContent: "center", alignItems: "center" }]}>
//       <Image
//         source={{ uri }}
//         style={[style, { position: "absolute", top: 0, left: 0 }]}
//         resizeMode="cover"
//         onLoadStart={() => {
//           setLoading(true);
//           setError(false);
//         }}
//         onLoad={() => {
//           setLoading(false);
//           setError(false);
//         }}
//         onError={() => {
//           setLoading(false);
//           setError(true);
//         }}
//       />

//       {loading && !error && (
//         <ActivityIndicator color={THEME.teal} size="small" />
//       )}

//       {error && (
//         <View style={styles.errorPreviewContainer}>
//           <FileText size={48} color="#ff6b6b" />
//           <Text style={styles.errorPreviewText}>File Not Found</Text>
//           {/* <Text style={styles.errorPreviewSubtext}>404 or removed</Text> */}
//         </View>
//       )}
//     </View>
//   );
// };

// // ─── ExpiryBadge ─────────────────────────────────────────────────────────────

// const ExpiryBadge = ({
//   status,
// }: {
//   status: "expired" | "expiring_soon" | "ok" | "none";
// }) => {
//   if (status === "none" || status === "ok") return null;
//   const isExpired = status === "expired";
//   return (
//     <View
//       style={[
//         styles.badge,
//         isExpired ? styles.badgeExpired : styles.badgeExpiringSoon,
//       ]}
//     >
//       <Text
//         style={[
//           styles.badgeText,
//           isExpired ? styles.badgeTextExpired : styles.badgeTextExpiringSoon,
//         ]}
//       >
//         {isExpired ? "Expired" : "Expiring Soon"}
//       </Text>
//     </View>
//   );
// };

// // ─── Main Screen ─────────────────────────────────────────────────────────────

// export default function DocumentsScreen({ navigation }: Props) {
//   const [modalVisible, setModalVisible] = useState(false);
//   const [fileError, setFileError] = useState("");
//   const [docNumberError, setDocNumberError] = useState("");
//   const [expiryError, setExpiryError] = useState("");

//   const [selectedDocType, setSelectedDocType] = useState<{
//     label: string;
//     value: string;
//     category: string;
//   } | null>(null);
//   const [verifying, setVerifying] = useState(false);
//   const [isVerified, setIsVerified] = useState(false);
//   const [documentNumber, setDocumentNumber] = useState("");
//   const [expirationDate, setExpirationDate] = useState<Date | null>(null);
//   const [showExpiryPicker, setShowExpiryPicker] = useState(false);
//   const [selectedFile, setSelectedFile] = useState<any>(null);
//   const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
//   const [uploading, setUploading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
//   const [loadingDocs, setLoadingDocs] = useState(true);
//   const [userId, setUserId] = useState<string | number | null>(null);
//   const [userProfile, setUserProfile] = useState<any>(null);

//   // STRICT: ONLY Visa and Security License documents need verification
//   const needsVerification = selectedDocType
//     ? isVerifiableDocType(selectedDocType)
//     : false;

//   // ✅ Only lock expiry for Visa & Security License
//   const isExpiryLocked = needsVerification;
//   useEffect(() => {
//     loadData();
//   }, []);
//   const toTitleCase = (text?: string) => {
//     if (!text) return "";

//     return text
//       .toLowerCase()
//       .split(" ")
//       .filter(Boolean)
//       .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(" ");
//   };
//   // Display names exactly as shown in your image
//   const DOCUMENT_DISPLAY_NAME: Record<string, string> = {
//     passport: "Passport",
//     visa: "Visa",
//     "driver license front": "Driver Licence (Front)",
//     "driver license back": "Driver Licence (Back)",
//     "driver licence front": "Driver Licence (Front)",
//     "driver licence back": "Driver Licence (Back)",
//     "security license": "Security Licence",
//     "security licence": "Security Licence",
//     "working with children": "Working With Children Check (WWCC)",
//     "working with children check": "Working With Children Check (WWCC)",
//     wwcc: "Working With Children Check (WWCC)",
//     "employment application form": "Employment Application Form",
//     "application form": "Employment Application Form",
//     "tfn declaration": "TFN Declaration",
//     "superannuation form": "Superannuation Form",
//     "first aid": "First Aid Certificate",
//     "first aid certificate": "First Aid Certificate",
//     cpr: "CPR Certificate",
//     "cpr certificate": "CPR Certificate",
//     vaccination: "Vaccination Certificate",
//     "vaccination certificate": "Vaccination Certificate",
//     "citizen ship": "Citizen Ship",
//     medicare: "Medicare",
//     "birth certificate": "Birth Certificate",
//   };

//   const DOCUMENT_ORDER: Record<string, number> = {
//     passport: 1,
//     visa: 2,
//     "driver license front": 3,
//     "driver licence front": 3,
//     "driver license back": 4,
//     "driver licence back": 4,
//     "security license": 5,
//     "security licence": 5,
//     "working with children": 6,
//     "working with children check": 6,
//     wwcc: 6,
//     "employment application form": 7,
//     "application form": 7,
//     "tfn declaration": 8,
//     "superannuation form": 9,
//     "first aid certificate": 10,
//     "first aid": 10,
//     "cpr certificate": 11,
//     cpr: 11,
//     "vaccination certificate": 12,
//     vaccination: 12,
//   };
//   const getDocumentPriority = (docName?: string): number => {
//     if (!docName) return 9999;
//     let key = docName.toLowerCase().trim();
//     key = key.replace(/check \(wwcc\)/i, "working with children");
//     key = key.replace(/certificate/i, "").trim();
//     key = key.replace(/\s+/g, " ");
//     return DOCUMENT_ORDER[key] ?? 9999;
//   };

//   const getDisplayName = (docName?: string): string => {
//     if (!docName) return "Unknown Document";

//     let key = docName.toLowerCase().trim();
//     key = key.replace(/check \(wwcc\)/i, "working with children");
//     key = key.replace(/certificate/i, "").trim();
//     key = key.replace(/\s+/g, " ");

//     return DOCUMENT_DISPLAY_NAME[key] || toTitleCase(docName);
//   };

//   const loadData = async () => {
//     try {
//       setLoadingDocs(true);

//       const uid = await AsyncStorage.getItem("@user_id");
//       const userStr = await AsyncStorage.getItem("user");
//       let id: string | number | null = uid;

//       if (!id && userStr) {
//         const cachedUser = JSON.parse(userStr);
//         id = cachedUser?.id ?? null;
//       }

//       setUserId(id);

//       if (id) {
//         const profile = await getUserProfile(id);

//         if (profile?.success && profile?.data) {
//           setUserProfile(profile.data);

//           if (profile.data.documents) {
//             const sortedDocs = [...profile.data.documents].sort((a, b) => {
//               return (
//                 getDocumentPriority(a.document_name) -
//                 getDocumentPriority(b.document_name)
//               );
//             });
//             setUploadedDocuments(sortedDocs);
//           }

//           await AsyncStorage.setItem("user", JSON.stringify(profile.data));
//         }
//       }
//     } catch (err) {
//       console.error("Failed to load documents:", err);
//     } finally {
//       setLoadingDocs(false);
//     }
//   };

//   const resetForm = () => {
//     setSelectedFile(null);
//     setUploadedFilePath(null);
//     setDocumentNumber("");
//     setExpirationDate(null);
//     setShowExpiryPicker(false);
//     setFileError("");
//     setDocNumberError("");
//     setExpiryError("");
//     setVerifying(false);
//     setIsVerified(false);
//   };
//   const handleOpenAddModal = (docType: {
//     label: string;
//     value: string;
//     category: string;
//   }) => {
//     resetForm();
//     setSelectedDocType(docType);
//     setIsVerified(false);
//     setExpirationDate(null);
//     setModalVisible(true);
//   };
//   const handleOpenEditModal = (item: Document) => {
//     resetForm();

//     const docType = {
//       label: item.document_name,
//       value: item.document_name,
//       category: item.document_category || "",
//     };

//     setSelectedDocType(docType);
//     setDocumentNumber(item.document_no || "");

//     if (item.document_expiry) {
//       const d = parseApiExpiryDate(item.document_expiry);
//       if (d) setExpirationDate(d);
//     }

//     if (item.file) {
//       setUploadedFilePath(item.file);
//     }

//     // Set verified state
//     if (isVerifiableDocType(docType)) {
//       setIsVerified(!!(item.document_no && item.document_expiry));
//     } else {
//       setIsVerified(true); // Non-verifiable = always ready to save
//     }

//     setModalVisible(true);
//   };

//   const openFile = async (file?: string | null) => {
//     const url = getFileUrl(file);
//     if (!url) return;
//     try {
//       const canOpen = await Linking.canOpenURL(url);
//       if (canOpen) {
//         await Linking.openURL(url);
//       } else {
//         Toast.show({
//           type: "error",
//           text1: "Cannot open file",
//           position: "bottom",
//         });
//       }
//     } catch {
//       Toast.show({
//         type: "error",
//         text1: "Failed to open file",
//         position: "bottom",
//       });
//     }
//   };

//   const handleUpload = async () => {
//     try {
//       const result = await launchImageLibrary({
//         mediaType: "mixed",
//         quality: 0.8,
//         selectionLimit: 1,
//       });
//       if (result.didCancel || !result.assets?.[0]) return;
//       const asset = result.assets[0];
//       if (!asset.type || !ALLOWED_FILE_TYPES.includes(asset.type)) {
//         Toast.show({
//           type: "error",
//           text1: "Unsupported file type",
//           position: "bottom",
//         });
//         return;
//       }
//       if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
//         Toast.show({
//           type: "error",
//           text1: "File too large (Max 5MB)",
//           position: "bottom",
//         });
//         return;
//       }
//       const file = {
//         uri: asset.uri!,
//         type: asset.type || "image/jpeg",
//         name: asset.fileName || `file_${Date.now()}`,
//       };
//       setSelectedFile(file);
//       setFileError("");
//       setUploading(true);
//       const uploaded = await uploadFile(file);
//       const filePath = uploaded?.url || uploaded?.path || uploaded?.file || "";
//       setUploadedFilePath(filePath);
//       Toast.show({
//         type: "success",
//         text1: "File uploaded successfully",
//         position: "bottom",
//       });
//     } catch {
//       Toast.show({ type: "error", text1: "Upload failed", position: "bottom" });
//     } finally {
//       setUploading(false);
//     }
//   };

//   // ─── Parse Expiry Date - Enhanced for multiple formats ─────────────────────
//   const parseApiExpiryDate = (value: string): Date | null => {
//     if (!value) return null;

//     // DD/MM/YYYY
//     const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
//     if (ddmmyyyy) {
//       const [, dd, mm, yyyy] = ddmmyyyy;
//       const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//       return isNaN(d.getTime()) ? null : d;
//     }

//     // DD-MM-YYYY (New format from Visa check)
//     const ddmmyyyyDash = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
//     if (ddmmyyyyDash) {
//       const [, dd, mm, yyyy] = ddmmyyyyDash;
//       const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//       return isNaN(d.getTime()) ? null : d;
//     }

//     // YYYY-MM-DD
//     const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//     if (yyyymmdd) {
//       const [, yyyy, mm, dd] = yyyymmdd;
//       const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//       return isNaN(d.getTime()) ? null : d;
//     }

//     // Fallback
//     const d = new Date(value);
//     return isNaN(d.getTime()) ? null : d;
//   };

//   // ─── Handle Verify Document - Updated ─────────────────────────────────────
//   const handleVerifyDocument = async () => {
//     if (!selectedDocType) {
//       Toast.show({
//         type: "error",
//         text1: "Please select document type",
//         position: "bottom",
//       });
//       return;
//     }

//     if (!documentNumber.trim()) {
//       setDocNumberError("Please enter document number");
//       Toast.show({
//         type: "error",
//         text1: "Please enter document number",
//         position: "bottom",
//       });
//       return;
//     }

//     const docNameLower = (selectedDocType.label || selectedDocType.value || "")
//       .toLowerCase()
//       .trim();
//     const isVisa = docNameLower.includes("visa");

//     try {
//       setVerifying(true);
//       setExpiryError("");
//       const token = await AsyncStorage.getItem("@auth_token");
//       let response;

//       if (isVisa) {
//         // ── VISA VERIFICATION ─────────────────────────────────────
//         let profile = userProfile;
//         if (!profile) {
//           const uid = userId || (await AsyncStorage.getItem("@user_id"));
//           if (uid) {
//             const res = await getUserProfile(uid);
//             if (res?.success && res?.data) {
//               profile = res.data;
//               setUserProfile(res.data);
//             }
//           }
//         }

//         if (!profile) {
//           Toast.show({
//             type: "error",
//             text1: "Unable to load profile for verification",
//             position: "bottom",
//           });
//           setVerifying(false);
//           return;
//         }

//         const { given_name, family_name } = splitName(profile?.name);
//         const countryCode = getCountryCode(profile?.country);
//         const rawDob =
//           profile?.dob ||
//           profile?.date_of_birth ||
//           profile?.staff?.dob ||
//           profile?.staff?.date_of_birth ||
//           profile?.contractor?.dob ||
//           profile?.contractor?.date_of_birth ||
//           "";

//         const dob = normalizeDobToISO(rawDob);

//         if (!dob) {
//           Toast.show({
//             type: "error",
//             text1: "Date of birth missing from profile",
//             position: "bottom",
//           });
//           setVerifying(false);
//           return;
//         }
//         if (!countryCode) {
//           Toast.show({
//             type: "error",
//             text1: "Country missing from profile",
//             position: "bottom",
//           });
//           setVerifying(false);
//           return;
//         }

//         const payload = {
//           passport: documentNumber.trim(),
//           country: countryCode,
//           family_name,
//           given_name,
//           dob,
//         };

//         console.log("Payload:", JSON.stringify(payload, null, 2));

//         response = await axios.post(`${BASE_URL}/admin/visa-check`, payload, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         });
//       } else {
//         // Security License verification...
//         const payload = {
//           document_type: selectedDocType.label,
//           license_number: documentNumber.trim(),
//         };

//         console.log("Payload:", JSON.stringify(payload, null, 2));

//         response = await axios.post(
//           `${Api_Url}/documents-online-verification-staffoo`,
//           payload,
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//               "Content-Type": "application/json",
//             },
//           },
//         );
//       }

//       console.log("VERIFY RESPONSE:", JSON.stringify(response?.data, null, 2));

//       const data = response?.data;

//       if (data?.success === false) {
//         setIsVerified(false);
//         setExpirationDate(null);
//         Toast.show({
//           type: "error",
//           text1: data?.message || "Document verification failed",
//           position: "bottom",
//         });
//         return;
//       }

//       // ── NEW: Support for expired_at in nested data ─────────────────────
//       const expiryRaw =
//         data?.expiry ||
//         data?.expiry_date ||
//         data?.document_expiry ||
//         data?.expired_at || // ← New
//         data?.data?.expiry ||
//         data?.data?.expiry_date ||
//         data?.data?.document_expiry ||
//         data?.data?.expired_at; // ← New (Most important)

//       if (expiryRaw) {
//         const dateObj = parseApiExpiryDate(expiryRaw);
//         if (dateObj) {
//           setExpirationDate(dateObj);
//           setIsVerified(true);
//           setShowExpiryPicker(false);

//           Toast.show({
//             type: "success",
//             text1: data?.message || "Document verified successfully",
//             position: "bottom",
//           });
//           return;
//         }
//       }

//       // Fallback if no expiry found
//       setIsVerified(false);
//       setExpirationDate(null);
//       setExpiryError("Could not process expiration date from verification");
//       Toast.show({
//         type: "error",
//         text1: "Verification successful but expiry date not found",
//         position: "bottom",
//       });
//     } catch (error: any) {
//       console.log("=== VERIFY ERROR ===");
//       console.log(JSON.stringify(error?.response?.data, null, 2));

//       setIsVerified(false);
//       setExpirationDate(null);

//       Toast.show({
//         type: "error",
//         text1:
//           error?.response?.data?.message ||
//           error?.message ||
//           "Document verification failed",
//         position: "bottom",
//       });
//     } finally {
//       setVerifying(false);
//     }
//   };

//   const handleExpiryDateChange = (event: any, date?: Date) => {
//     if (Platform.OS === "android") setShowExpiryPicker(false);
//     if (event?.type === "dismissed") return;
//     if (date) {
//       setExpirationDate(date);
//       setExpiryError("");
//     }
//   };

//   const handleSave = async () => {
//     let hasError = false;
//     setFileError("");
//     setDocNumberError("");
//     setExpiryError("");

//     if (!selectedFile && !uploadedFilePath) {
//       setFileError("Please upload a file");
//       hasError = true;
//     }
//     if (!documentNumber.trim()) {
//       setDocNumberError("Please fill the document number");
//       hasError = true;
//     }

//     if (needsVerification) {
//       // ONLY visa documents & Security License must be verified online first.
//       if (!isVerified || !expirationDate) {
//         Toast.show({
//           type: "error",
//           text1: "Please verify document first",
//           position: "bottom",
//         });
//         return;
//       }
//     } else if (!expirationDate) {
//       // All other documents simply need an expiry date picked manually.
//       setExpiryError("Please select an expiry date");
//       hasError = true;
//     }

//     if (hasError) {
//       Toast.show({
//         type: "error",
//         text1: "Please fill all mandatory fields",
//         position: "bottom",
//       });
//       return;
//     }

//     setSaving(true);
//     try {
//       let fileName = "";
//       if (uploadedFilePath) {
//         fileName = uploadedFilePath.split("/").pop() || uploadedFilePath;
//       } else if (selectedFile?.name) {
//         fileName = selectedFile.name;
//       } else {
//         fileName = "unknown_file";
//       }

//       const year = expirationDate!.getFullYear();
//       const month = String(expirationDate!.getMonth() + 1).padStart(2, "0");
//       const day = String(expirationDate!.getDate()).padStart(2, "0");
//       const expDate = `${year}-${month}-${day}`;

//       const existingDoc = uploadedDocuments.find((d) => {
//         const apiName =
//           d.document_name?.toLowerCase().replace(/[\s_]+/g, "") || "";
//         const apiType =
//           d.document_type?.toLowerCase().replace(/[\s_]+/g, "") || "";
//         const matchValue = selectedDocType!.value
//           .toLowerCase()
//           .replace(/[\s_]+/g, "");
//         return apiName === matchValue || apiType === matchValue;
//       });

//       const payload: any = {
//         user_id: userId,
//         document_no: documentNumber.trim(),
//         document_expiry: expDate,
//         file: fileName,
//         document_category: selectedDocType!.category,
//       };

//       if (existingDoc) {
//         payload.id = existingDoc.id;
//         payload.document_name =
//           existingDoc.document_name || selectedDocType!.value;
//         payload.document_type =
//           existingDoc.document_type ||
//           selectedDocType!.value.toLowerCase().replace(/\s+/g, "_");
//         payload.exp = (existingDoc as any).exp ?? false;
//         payload.no = (existingDoc as any).no ?? false;
//       } else {
//         payload.document_name = selectedDocType!.value;
//         payload.document_type = selectedDocType!.value
//           .toLowerCase()
//           .replace(/\s+/g, "_");
//         payload.exp = false;
//         payload.no = false;
//       }

//       const token = await AsyncStorage.getItem("@auth_token");
//       await axios.post(`${BASE_URL}/guard-update-documents`, payload, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       });

//       Toast.show({
//         type: "success",
//         text1: "Document Saved Successfully",
//         position: "bottom",
//       });
//       setModalVisible(false);
//       loadData();
//     } catch (err) {
//       console.error(err);
//       Toast.show({ type: "error", text1: "Save Failed", position: "bottom" });
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ─── Modal File Preview ───────────────────────────────────────────────────

//   const renderModalPreview = () => {
//     const fileUri =
//       selectedFile?.uri ||
//       (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
//     const fileMime = selectedFile?.type || null;
//     const fileName =
//       selectedFile?.name || uploadedFilePath?.split("/").pop() || "Document";

//     if (!fileUri) {
//       return (
//         <View style={styles.imagePlaceholder}>
//           <View style={styles.errorPreviewContainer}>
//             <CloudUpload size={48} color={THEME.textMuted} />
//             <Text style={styles.previewText}>No file uploaded yet</Text>
//           </View>
//         </View>
//       );
//     }

//     const isImage = isImageFile(fileUri, fileMime);

//     if (isImage) {
//       return (
//         <View style={styles.imagePlaceholder}>
//           <LazyImage uri={fileUri} style={styles.previewImage} />
//         </View>
//       );
//     }

//     // PDF / DOC / Other files
//     return (
//       <View style={styles.docPreviewCard}>
//         <View style={styles.docPreviewIconWrap}>
//           <FileText size={48} color={THEME.teal} />
//         </View>
//         <Text style={styles.docPreviewLabel} numberOfLines={2}>
//           {fileName}
//         </Text>
//         <TouchableOpacity
//           style={styles.viewDocButton}
//           onPress={() => openFile(fileUri)}
//           activeOpacity={0.8}
//         >
//           <ExternalLink size={16} color="#fff" style={{ marginRight: 6 }} />
//           <Text style={styles.viewDocButtonText}>OPEN DOCUMENT</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   // ─── Card: API-driven (filled state) ─────────────────────────────────────

//   const renderFilledCard = (item: Document) => {
//     const status = getExpiryStatus(item.document_expiry);
//     const fileUrl = getFileUrl(item.file);
//     const isImg = isImageFile(item.file);
//     const ext = item.file?.split(".").pop()?.toUpperCase() || "";

//     return (
//       <LinearGradient
//         colors={["#1e2538", "#141929"]}
//         style={styles.cardGradient}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//       >
//         <View style={styles.cardTopRow}>
//           <View style={styles.docIconBox}>
//             <FileText size={22} color={THEME.teal} />
//           </View>
//           <View style={{ flex: 1, marginHorizontal: 12 }}>
//             <Text style={styles.cardDocName} numberOfLines={1}>
//               {getDisplayName(item.document_name)}
//             </Text>
//             <View style={styles.cardSubRow}>
//               {!!ext && (
//                 <View style={styles.extBadge}>
//                   <Text style={styles.extBadgeText}>{ext}</Text>
//                 </View>
//               )}
//               <ExpiryBadge status={status} />
//             </View>
//           </View>
//         </View>

//         <View style={styles.divider} />

//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Document Number</Text>
//           <Text style={styles.infoValue}>{item.document_no || "—"}</Text>
//         </View>
//         <View style={styles.infoRow}>
//           <Text style={styles.infoLabel}>Expiration Date</Text>
//           <Text style={styles.infoValue}>
//             {formatAUDate(item.document_expiry)}
//           </Text>
//         </View>

//         {/* File Status */}
//         {!item.file && (
//           <Text style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>
//             File missing (404)
//           </Text>
//         )}

//         <View style={styles.cardActionsRow}>
//           <TouchableOpacity
//             style={[styles.viewBtn, { flex: 1, marginTop: 0 }]}
//             onPress={() => openFile(item.file)}
//             activeOpacity={0.85}
//           >
//             <Eye size={17} color="#fff" style={{ marginRight: 8 }} />
//             <Text style={styles.viewBtnText}>
//               {isImg ? "VIEW IMAGE" : "VIEW / DOWNLOAD"}
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={[styles.editBtn, { flex: 1 }]}
//             onPress={() => handleOpenEditModal(item)}
//             activeOpacity={0.85}
//           >
//             <Pencil size={16} color={THEME.teal} style={{ marginRight: 8 }} />
//             <Text style={styles.editBtnText}>EDIT</Text>
//           </TouchableOpacity>
//         </View>
//       </LinearGradient>
//     );
//   };

//   // ─── Card: API-driven (empty state) ──────────────────────────────────────

//   const renderEmptyCard = (item: Document) => (
//     <LinearGradient
//       colors={["#171d30", "#0f1322"]}
//       style={[
//         styles.cardGradient,
//         {
//           borderStyle: "dashed",
//           borderWidth: 1,
//           borderColor: "rgba(255,255,255,0.08)",
//         },
//       ]}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 1, y: 1 }}
//     >
//       <View style={styles.cardTopRow}>
//         <View
//           style={[
//             styles.docIconBox,
//             { backgroundColor: "rgba(255,255,255,0.03)" },
//           ]}
//         >
//           <FileText size={22} color={THEME.textMuted} />
//         </View>
//         <View style={{ flex: 1, marginHorizontal: 12 }}>
//           <Text style={[styles.cardDocName, { color: THEME.textMuted }]}>
//             {getDisplayName(item.document_name)}
//           </Text>
//           <Text style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
//             Add Required Document
//           </Text>
//         </View>
//       </View>

//       <TouchableOpacity
//         style={styles.addCardButton}
//         onPress={() =>
//           handleOpenAddModal({
//             label: item.document_name,
//             value: item.document_name,
//             category: item.document_category || item.document_type,
//           })
//         }
//         activeOpacity={0.8}
//       >
//         <PlusCircle size={16} color={THEME.teal} style={{ marginRight: 6 }} />
//         <Text style={styles.addCardButtonText}>ADD DOCUMENT</Text>
//       </TouchableOpacity>
//     </LinearGradient>
//   );

//   const renderItem = ({ item }: { item: Document }) => {
//     const isFilled = !!(item.file && item.file.trim().length > 0);
//     return isFilled ? renderFilledCard(item) : renderEmptyCard(item);
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#111111" />

//       <View style={styles.header}>
//         <TouchableOpacity
//           onPress={() => navigation.goBack()}
//           style={styles.backBtn}
//         >
//           <ArrowLeft size={22} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Documents</Text>
//         <View style={{ width: 40 }} />
//       </View>

//       {loadingDocs ? (
//         <ActivityIndicator
//           size="large"
//           color={THEME.teal}
//           style={{ marginTop: 60 }}
//         />
//       ) : (
//         <FlatList
//           data={uploadedDocuments}
//           keyExtractor={(item) => item.id.toString()}
//           renderItem={renderItem}
//           contentContainerStyle={styles.listContent}
//           ListEmptyComponent={
//             <Text style={styles.emptyText}>No documents found</Text>
//           }
//         />
//       )}

//       {/* ── Upload Modal ── */}
//       <Modal
//         animationType="slide"
//         transparent
//         visible={modalVisible}
//         onRequestClose={() => {
//           setModalVisible(false);
//           resetForm();
//         }}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>
//                 {getDisplayName(
//                   selectedDocType?.label || selectedDocType?.value,
//                 )}
//               </Text>
//               <TouchableOpacity
//                 onPress={() => {
//                   setModalVisible(false);
//                   resetForm();
//                 }}
//               >
//                 <X size={24} color="#fff" />
//               </TouchableOpacity>
//             </View>

//             <ScrollView
//               style={styles.modalBody}
//               keyboardShouldPersistTaps="handled"
//             >
//               {/* File upload block */}
//               <View style={styles.imageUploadArea}>
//                 {renderModalPreview()}
//                 <TouchableOpacity
//                   style={styles.uploadTriggerButton}
//                   onPress={handleUpload}
//                   disabled={uploading}
//                 >
//                   {uploading ? (
//                     <ActivityIndicator color="#fff" />
//                   ) : (
//                     <>
//                       <CloudUpload
//                         size={22}
//                         color="#fff"
//                         style={{ marginRight: 8 }}
//                       />
//                       <Text style={styles.uploadTriggerText}>
//                         {selectedFile || uploadedFilePath
//                           ? "REPLACE FILE"
//                           : "UPLOAD FILE (IMAGE, PDF, DOC) *"}
//                       </Text>
//                     </>
//                   )}
//                 </TouchableOpacity>
//                 {fileError ? (
//                   <Text style={styles.errorText}>{fileError}</Text>
//                 ) : null}
//               </View>
//               {/* Document type — informational only, never locked */}
//               {/* <Text style={styles.fieldLabel}>DOCUMENT TYPE</Text>
//               <View style={styles.dropdownSelector}>
//                 <Text style={styles.dropdownText}>
//                   {selectedDocType ? selectedDocType.label : ""}
//                 </Text>
//               </View> */}
//               {/* Document type — informational only, never locked */}
//               <Text style={styles.fieldLabel}>DOCUMENT TYPE</Text>
//               <View style={styles.dropdownSelector}>
//                 <Text style={styles.dropdownText}>
//                   {selectedDocType
//                     ? getDisplayName(
//                         selectedDocType.label || selectedDocType.value,
//                       )
//                     : ""}
//                 </Text>
//               </View>
//               {/* Document Number */}
//               <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
//                 DOCUMENT NUMBER *
//               </Text>
//               {/* STRICT: Show verify button ONLY for Visa and Security License documents */}
//               {needsVerification ? (
//                 <View style={{ flexDirection: "row" }}>
//                   <TextInput
//                     style={[
//                       styles.inputBox,
//                       {
//                         flex: 1,
//                         borderTopRightRadius: 0,
//                         borderBottomRightRadius: 0,
//                       },
//                     ]}
//                     placeholder="Enter document number"
//                     placeholderTextColor={THEME.textMuted}
//                     value={documentNumber}
//                     maxLength={DOC_NO_MAX}
//                     autoCapitalize="characters"
//                     onChangeText={(text) => {
//                       const formattedText = text.toUpperCase();
//                       setDocumentNumber(formattedText);
//                       setIsVerified(false);
//                       setExpirationDate(null);
//                       setExpiryError("");
//                     }}
//                   />

//                   <TouchableOpacity
//                     style={styles.verifyButton}
//                     disabled={verifying}
//                     onPress={handleVerifyDocument}
//                   >
//                     {verifying ? (
//                       <ActivityIndicator color={THEME.teal} />
//                     ) : (
//                       <Text style={styles.verifyButtonText}>Verify</Text>
//                     )}
//                   </TouchableOpacity>
//                 </View>
//               ) : (
//                 <TextInput
//                   style={styles.inputBox}
//                   placeholder="Enter document number"
//                   placeholderTextColor={THEME.textMuted}
//                   value={documentNumber}
//                   maxLength={DOC_NO_MAX}
//                   autoCapitalize="characters"
//                   onChangeText={(text) => setDocumentNumber(text.toUpperCase())}
//                 />
//               )}
//               {docNumberError ? (
//                 <Text style={styles.errorText}>{docNumberError}</Text>
//               ) : null}
//               {/* Show helper text ONLY for verifiable documents that aren't verified yet */}
//               {needsVerification && !isVerified && (
//                 <Text style={styles.inputHelpText}>
//                   Tap "Verify" to validate this document and auto-fill its
//                   expiry date.
//                 </Text>
//               )}
//               {/* Expiration Date */}
//               <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
//                 EXPIRATION DATE *
//               </Text>

//               <TouchableOpacity
//                 style={[
//                   styles.dateButton,
//                   isExpiryLocked && styles.dateButtonDisabled,
//                 ]}
//                 activeOpacity={isExpiryLocked ? 1 : 0.8}
//                 disabled={isExpiryLocked}
//                 onPress={() => {
//                   if (!isExpiryLocked) {
//                     setShowExpiryPicker(true);
//                   }
//                 }}
//               >
//                 <Text
//                   style={[
//                     styles.dateText,
//                     { color: expirationDate ? "#fff" : THEME.textMuted },
//                   ]}
//                 >
//                   {expirationDate
//                     ? formatAUDate(expirationDate)
//                     : needsVerification
//                     ? "Verify document to auto-fill expiry date"
//                     : "Tap to select expiry date"}
//                 </Text>

//                 {isExpiryLocked ? (
//                   <Lock size={16} color={THEME.textMuted} />
//                 ) : (
//                   <CalendarDays size={16} color={THEME.teal} />
//                 )}
//               </TouchableOpacity>

//               {/* Help Messages */}
//               {isExpiryLocked && (
//                 <Text style={styles.inputHelpText}>
//                   Auto-filled from verification — cannot be edited manually.
//                 </Text>
//               )}

//               {expiryError ? (
//                 <Text style={styles.errorText}>{expiryError}</Text>
//               ) : null}

//               {/* Date Picker - Only show for non-locked documents */}
//               {showExpiryPicker && !isExpiryLocked && (
//                 <DateTimePicker
//                   value={expirationDate || new Date()}
//                   mode="date"
//                   display={Platform.OS === "ios" ? "spinner" : "default"}
//                   onChange={handleExpiryDateChange}
//                 />
//               )}
//               {Platform.OS === "ios" && showExpiryPicker && !isExpiryLocked && (
//                 <TouchableOpacity
//                   style={styles.iosPickerDoneButton}
//                   onPress={() => setShowExpiryPicker(false)}
//                 >
//                   <Text style={styles.iosPickerDoneText}>Done</Text>
//                 </TouchableOpacity>
//               )}
//               <View style={{ height: 20 }} />
//             </ScrollView>

//             <TouchableOpacity
//               style={styles.saveButton}
//               onPress={handleSave}
//               disabled={saving}
//             >
//               {saving ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.saveButtonText}>SAVE DOCUMENT</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>

//         {/* Toast rendered INSIDE the Modal so it appears ABOVE the modal content.
//             RN Modal is a separate native window layer — the app-level <Toast />
//             (usually mounted in App.tsx) gets covered by this Modal, so we mount
//             a second Toast instance here, scoped to this Modal's layer. */}
//         <Toast />
//       </Modal>
//     </SafeAreaView>
//   );
// }

// // ─── Stylesheet ──────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: THEME.background, paddingTop: 25 },

//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     height: 56,
//     borderBottomWidth: 1,
//     borderBottomColor: THEME.border,
//   },
//   backBtn: {
//     width: 40,
//     height: 40,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

//   listContent: { padding: 16, paddingBottom: 40 },
//   emptyText: {
//     textAlign: "center",
//     marginTop: 60,
//     color: THEME.textMuted,
//     fontSize: 15,
//   },

//   // ── Cards ──
//   cardGradient: { borderRadius: 12, padding: 16, marginBottom: 16 },
//   cardTopRow: { flexDirection: "row", alignItems: "center" },
//   docIconBox: {
//     width: 40,
//     height: 40,
//     borderRadius: 8,
//     backgroundColor: "rgba(137,231,208,0.1)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   cardDocName: { color: "#fff", fontSize: 15, fontWeight: "bold" },
//   cardSubRow: {
//     flexDirection: "row",
//     marginTop: 4,
//     alignItems: "center",
//     gap: 8,
//   },
//   extBadge: {
//     backgroundColor: "rgba(255,255,255,0.1)",
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4,
//   },
//   extBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
//   editIconBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "rgba(137,231,208,0.08)",
//     borderWidth: 1,
//     borderColor: "rgba(137,231,208,0.2)",
//   },
//   divider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
//   infoRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 6,
//   },
//   infoLabel: { color: THEME.textMuted, fontSize: 13 },
//   infoValue: { color: "#fff", fontSize: 13, fontWeight: "500" },
//   cardActionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
//   viewBtn: {
//     backgroundColor: THEME.accent,
//     height: 40,
//     borderRadius: 8,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 12,
//   },
//   viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
//   editBtn: {
//     height: 40,
//     borderRadius: 8,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "rgba(137,231,208,0.08)",
//     borderWidth: 1,
//     borderColor: "rgba(137,231,208,0.25)",
//   },
//   editBtnText: { color: THEME.teal, fontSize: 13, fontWeight: "bold" },
//   addCardButton: {
//     height: 38,
//     backgroundColor: "rgba(137,231,208,0.08)",
//     borderRadius: 6,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 14,
//     borderWidth: 1,
//     borderColor: "rgba(137,231,208,0.2)",
//   },
//   addCardButtonText: { color: THEME.teal, fontSize: 12, fontWeight: "bold" },

//   // ── Badges ──
//   badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
//   badgeExpired: { backgroundColor: "rgba(255,107,107,0.15)" },
//   badgeExpiringSoon: { backgroundColor: "rgba(240,165,0,0.15)" },
//   badgeText: { fontSize: 10, fontWeight: "bold" },
//   badgeTextExpired: { color: "#ff6b6b" },
//   badgeTextExpiringSoon: { color: "#f0a500" },

//   // ── Modal ──
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.7)",
//     justifyContent: "flex-end",
//   },
//   modalContent: {
//     backgroundColor: THEME.cardBg,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     height: "92%",
//   },
//   modalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: THEME.border,
//   },
//   modalTitle: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "bold",
//     flex: 1,
//     marginRight: 12,
//   },
//   modalBody: { padding: 16 },

//   imageUploadArea: { alignItems: "center", marginBottom: 20 },
//   imagePlaceholder: {
//     width: width - 64,
//     height: 160,
//     backgroundColor: "rgba(255,255,255,0.05)",
//     borderRadius: 12,
//     overflow: "hidden",
//     marginBottom: 12,
//   },
//   previewImage: { width: "100%", height: "100%" },
//   uploadTriggerButton: {
//     flexDirection: "row",
//     backgroundColor: "rgba(255,255,255,0.05)",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     borderStyle: "dashed",
//     width: "100%",
//     height: 48,
//     borderRadius: 8,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   uploadTriggerText: { color: "#fff", fontSize: 12, fontWeight: "600" },
//   previewText: { color: "#fff" },
//   docPreviewCard: {
//     width: "100%",
//     padding: 16,
//     backgroundColor: "rgba(255,255,255,0.03)",
//     borderRadius: 12,
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   docPreviewIconWrap: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: "rgba(137,231,208,0.05)",
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   docPreviewLabel: {
//     color: "#fff",
//     fontSize: 13,
//     textAlign: "center",
//     marginBottom: 12,
//   },
//   viewDocButton: {
//     flexDirection: "row",
//     backgroundColor: THEME.accent,
//     paddingHorizontal: 16,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   viewDocButtonText: { color: "#fff", fontSize: 11, fontWeight: "bold" },

//   fieldLabel: {
//     color: THEME.teal,
//     fontSize: 11,
//     fontWeight: "bold",
//     marginBottom: 6,
//   },
//   inputBox: {
//     backgroundColor: "rgba(255,255,255,0.05)",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     height: 48,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     color: "#fff",
//     fontSize: 14,
//   },
//   verifyButton: {
//     width: 110,
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     borderLeftWidth: 0,
//     borderTopRightRadius: 8,
//     borderBottomRightRadius: 8,
//     backgroundColor: "rgba(255,255,255,0.05)",
//   },
//   verifyButtonText: { color: THEME.teal, fontWeight: "bold", fontSize: 14 },
//   dateButton: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "rgba(255,255,255,0.05)",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     height: 48,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//   },
//   dateText: { color: "#fff", fontSize: 14 },
//   dateButtonDisabled: {
//     backgroundColor: "rgba(255,255,255,0.02)",
//     borderColor: "rgba(255,255,255,0.05)",
//   },
//   errorText: { color: "#ff6b6b", fontSize: 12, marginTop: 4 },

//   iosPickerDoneButton: {
//     alignSelf: "flex-end",
//     marginTop: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 6,
//     backgroundColor: "rgba(137,231,208,0.12)",
//   },
//   iosPickerDoneText: { color: THEME.teal, fontWeight: "bold", fontSize: 13 },

//   dropdownSelector: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "rgba(255,255,255,0.05)",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     height: 48,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//   },
//   dropdownText: { color: "#fff", fontSize: 14, fontWeight: "500" },
//   inputHelpText: {
//     color: THEME.textMuted,
//     fontSize: 11,
//     marginTop: 4,
//     fontStyle: "italic",
//   },

//   saveButton: {
//     backgroundColor: THEME.accent,
//     height: 54,
//     justifyContent: "center",
//     alignItems: "center",
//     margin: 16,
//     borderRadius: 8,
//   },
//   saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
//   errorPreviewContainer: {
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//     backgroundColor: "rgba(0,0,0,0.3)",
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "rgba(138, 135, 135, 0.2)",
//     width: "100%",
//     height: "100%",
//   },

//   errorPreviewText: {
//     color: "#ff6b6b",
//     fontSize: 16,
//     fontWeight: "600",
//     marginTop: 12,
//   },

//   errorPreviewSubtext: {
//     color: THEME.textMuted,
//     fontSize: 13,
//     marginTop: 4,
//   },
// });

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  X,
  FileText,
  CloudUpload,
  ExternalLink,
  Eye,
  PlusCircle,
  Lock,
  Pencil,
  CalendarDays,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL, getUserProfile, uploadFile } from "../services/authApi";
import { launchImageLibrary } from "react-native-image-picker";
import LinearGradient from "react-native-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

const FILE_BASE_URL = "https://apis.staffoo.com.au/staff_documents/";
// const FILE_BASE_URL = "https://staging.apis.staffoo.com.au/staff_documents/";
const Api_Url = "https://apis.thescouts.com.au/api";

type Props = { navigation: any };

type Document = {
  id: number;
  document_name: string;
  document_no?: string;
  document_expiry?: string;
  file?: string;
  document_type: string;
  document_category?: string;
};

const THEME = {
  background: "#111111",
  cardBg: "#1C2541",
  accent: "#366bf0",
  teal: "#89E7D0",
  textLight: "#FFFFFF",
  textMuted: "#6C7A89",
  border: "rgba(255, 255, 255, 0.1)",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DOC_NO_MAX = 20;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// STRICT: ONLY these exact document names will show the verify button
const VERIFIABLE_DOCUMENT_NAMES = ["visa", "security license"];

// ─── Country name -> ISO3 code map (extend as needed) ────────────────────────
const COUNTRY_TO_ISO3: Record<string, string> = {
  pakistan: "PAK",
  australia: "AUS",
  india: "IND",
  bangladesh: "BGD",
  "united kingdom": "GBR",
  "united states": "USA",
  philippines: "PHL",
  nepal: "NPL",
  "sri lanka": "LKA",
  china: "CHN",
  malaysia: "MYS",
  indonesia: "IDN",
  "new zealand": "NZL",
  canada: "CAN",
  "south africa": "ZAF",
  nigeria: "NGA",
  vietnam: "VNM",
  thailand: "THA",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isImageFile = (
  fileStr?: string | null,
  mimeType?: string | null,
): boolean => {
  if (!fileStr && !mimeType) return false;
  if (mimeType && mimeType.startsWith("image/")) return true;
  if (!fileStr) return false;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileStr);
};

const getFileUrl = (file?: string | null): string | null => {
  if (!file) return null;
  if (file.startsWith("http") || file.startsWith("file://")) return file;
  return `${FILE_BASE_URL}${file}`;
};

const getExpiryStatus = (
  expiryStr?: string,
): "expired" | "expiring_soon" | "ok" | "none" => {
  if (!expiryStr) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "ok";
};

// Formats string timeline keys (YYYY-MM-DD) or Date entities directly into Australian Syntax (DD/MM/YYYY)
const formatAUDate = (dateSource?: string | Date | null): string => {
  if (!dateSource) return "—";

  if (dateSource instanceof Date) {
    const day = String(dateSource.getDate()).padStart(2, "0");
    const month = String(dateSource.getMonth() + 1).padStart(2, "0");
    const year = dateSource.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const [year, month, day] = dateSource.split("-");
  if (!year || !month || !day) return dateSource;
  return `${day}/${month}/${year}`;
};

// STRICT CHECK: ONLY returns true for documents named "Visa" or "Security License"
const isVerifiableDocType = (opts: {
  label?: string | null;
  value?: string | null;
  category?: string | null;
}): boolean => {
  const docName = (opts.label || opts.value || "").toLowerCase().trim();

  const isVerifiable = VERIFIABLE_DOCUMENT_NAMES.some(
    (keyword) => docName === keyword || docName.includes(keyword),
  );

  console.log(
    `[VERIFY CHECK] Document: "${docName}", Verifiable: ${isVerifiable}`,
  );
  return isVerifiable;
};

// Parses an expiry date that may come back as DD/MM/YYYY or YYYY-MM-DD
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

  // Fallback - let Date try
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Maps a full country name to an ISO3 code (falls back to uppercased input)
const getCountryCode = (countryName?: string | null): string => {
  if (!countryName) return "";
  const key = countryName.toLowerCase().trim();
  return COUNTRY_TO_ISO3[key] || countryName.toUpperCase();
};

const splitName = (
  fullName?: string | null,
): { given_name: string; family_name: string } => {
  if (!fullName) return { given_name: "", family_name: "" };

  const firstName = fullName.trim().split(/\s+/)[0];

  return {
    given_name: firstName,
    family_name: firstName,
  };
};

// Normalises a date-of-birth value (handles DD/MM/YYYY or YYYY-MM-DD) into YYYY-MM-DD
const normalizeDobToISO = (value?: string | null): string => {
  if (!value) return "";

  const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
};

// ─── LazyImage ───────────────────────────────────────────────────────────────

const LazyImage = ({ uri, style }: { uri: string; style: any }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={[style, { justifyContent: "center", alignItems: "center" }]}>
      <Image
        source={{ uri }}
        style={[style, { position: "absolute", top: 0, left: 0 }]}
        resizeMode="cover"
        onLoadStart={() => {
          setLoading(true);
          setError(false);
        }}
        onLoad={() => {
          setLoading(false);
          setError(false);
        }}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />

      {loading && !error && (
        <ActivityIndicator color={THEME.teal} size="small" />
      )}

      {error && (
        <View style={styles.errorPreviewContainer}>
          <FileText size={48} color="#ff6b6b" />
          <Text style={styles.errorPreviewText}>File Not Found</Text>
          {/* <Text style={styles.errorPreviewSubtext}>404 or removed</Text> */}
        </View>
      )}
    </View>
  );
};

// ─── ExpiryBadge ─────────────────────────────────────────────────────────────

const ExpiryBadge = ({
  status,
}: {
  status: "expired" | "expiring_soon" | "ok" | "none";
}) => {
  if (status === "none" || status === "ok") return null;
  const isExpired = status === "expired";
  return (
    <View
      style={[
        styles.badge,
        isExpired ? styles.badgeExpired : styles.badgeExpiringSoon,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          isExpired ? styles.badgeTextExpired : styles.badgeTextExpiringSoon,
        ]}
      >
        {isExpired ? "Expired" : "Expiring Soon"}
      </Text>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DocumentsScreen({ navigation }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [fileError, setFileError] = useState("");
  const [docNumberError, setDocNumberError] = useState("");
  const [expiryError, setExpiryError] = useState("");

  const [selectedDocType, setSelectedDocType] = useState<{
    label: string;
    value: string;
    category: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [userId, setUserId] = useState<string | number | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // STRICT: ONLY Visa and Security License documents need verification
  const needsVerification = selectedDocType
    ? isVerifiableDocType(selectedDocType)
    : false;

  // ✅ Only lock expiry for Visa & Security License
  const isExpiryLocked = needsVerification;
  useEffect(() => {
    loadData();
  }, []);

  // ─── Visa-specific helpers ─────────────────────────────────────────────
  const isVisaDocType = (opts: {
    label?: string | null;
    value?: string | null;
  }): boolean => {
    const name = (opts.label || opts.value || "").toLowerCase().trim();
    return name === "visa" || name.includes("visa");
  };

  // Finds the Passport entry from the user's documents (as returned by
  // getUserProfile) so its document_no can be auto-filled into the Visa
  // document number field.
  const getPassportDocument = (): Document | undefined => {
    return userProfile?.documents?.find(
      (d: Document) => d.document_name?.toLowerCase().trim() === "passport",
    );
  };
  const toTitleCase = (text?: string) => {
    if (!text) return "";

    return text
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  // Display names exactly as shown in your image
  const DOCUMENT_DISPLAY_NAME: Record<string, string> = {
    passport: "Passport",
    visa: "Visa",
    "driver license front": "Driver Licence (Front)",
    "driver license back": "Driver Licence (Back)",
    "driver licence front": "Driver Licence (Front)",
    "driver licence back": "Driver Licence (Back)",
    "security license": "Security Licence",
    "security licence": "Security Licence",
    "working with children": "Working With Children Check (WWCC)",
    "working with children check": "Working With Children Check (WWCC)",
    wwcc: "Working With Children Check (WWCC)",
    "employment application form": "Employment Application Form",
    "application form": "Employment Application Form",
    "tfn declaration": "TFN Declaration",
    "superannuation form": "Superannuation Form",
    "first aid": "First Aid Certificate",
    "first aid certificate": "First Aid Certificate",
    cpr: "CPR Certificate",
    "cpr certificate": "CPR Certificate",
    vaccination: "Vaccination Certificate",
    "vaccination certificate": "Vaccination Certificate",
    "citizen ship": "Citizen Ship",
    medicare: "Medicare",
    "birth certificate": "Birth Certificate",
  };

  const DOCUMENT_ORDER: Record<string, number> = {
    passport: 1,
    visa: 2,
    "driver license front": 3,
    "driver licence front": 3,
    "driver license back": 4,
    "driver licence back": 4,
    "security license": 5,
    "security licence": 5,
    "working with children": 6,
    "working with children check": 6,
    wwcc: 6,
    "employment application form": 7,
    "application form": 7,
    "tfn declaration": 8,
    "superannuation form": 9,
    "first aid certificate": 10,
    "first aid": 10,
    "cpr certificate": 11,
    cpr: 11,
    "vaccination certificate": 12,
    vaccination: 12,
  };
  const getDocumentPriority = (docName?: string): number => {
    if (!docName) return 9999;
    let key = docName.toLowerCase().trim();
    key = key.replace(/check \(wwcc\)/i, "working with children");
    key = key.replace(/certificate/i, "").trim();
    key = key.replace(/\s+/g, " ");
    return DOCUMENT_ORDER[key] ?? 9999;
  };

  const getDisplayName = (docName?: string): string => {
    if (!docName) return "Unknown Document";

    let key = docName.toLowerCase().trim();
    key = key.replace(/check \(wwcc\)/i, "working with children");
    key = key.replace(/certificate/i, "").trim();
    key = key.replace(/\s+/g, " ");

    return DOCUMENT_DISPLAY_NAME[key] || toTitleCase(docName);
  };

  const loadData = async () => {
    try {
      setLoadingDocs(true);

      const uid = await AsyncStorage.getItem("@user_id");
      const userStr = await AsyncStorage.getItem("user");
      let id: string | number | null = uid;

      if (!id && userStr) {
        const cachedUser = JSON.parse(userStr);
        id = cachedUser?.id ?? null;
      }

      setUserId(id);

      if (id) {
        const profile = await getUserProfile(id);

        if (profile?.success && profile?.data) {
          setUserProfile(profile.data);

          if (profile.data.documents) {
            const sortedDocs = [...profile.data.documents].sort((a, b) => {
              return (
                getDocumentPriority(a.document_name) -
                getDocumentPriority(b.document_name)
              );
            });
            setUploadedDocuments(sortedDocs);
          }

          await AsyncStorage.setItem("user", JSON.stringify(profile.data));
        }
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUploadedFilePath(null);
    setDocumentNumber("");
    setExpirationDate(null);
    setShowExpiryPicker(false);
    setFileError("");
    setDocNumberError("");
    setExpiryError("");
    setVerifying(false);
    setIsVerified(false);
  };
  const handleOpenAddModal = (docType: {
    label: string;
    value: string;
    category: string;
  }) => {
    // STRICT: A Passport (with a document number) must already exist
    // before a Visa document can be added, since the Visa verification
    // is performed against the passport number.
    if (isVisaDocType(docType)) {
      const passportDoc = getPassportDocument();
      if (!passportDoc || !passportDoc.document_no) {
        Toast.show({
          type: "error",
          text1: "Passport required",
          text2: "Please add your Passport document first.",
          position: "bottom",
        });
        return;
      }
    }

    resetForm();
    setSelectedDocType(docType);
    setIsVerified(false);
    setExpirationDate(null);

    // Auto-fill the Visa document number from the passport on file.
    if (isVisaDocType(docType)) {
      const passportDoc = getPassportDocument();
      if (passportDoc?.document_no) {
        setDocumentNumber(passportDoc.document_no.toUpperCase());
      }
    }

    setModalVisible(true);
  };
  const handleOpenEditModal = (item: Document) => {
    resetForm();

    const docType = {
      label: item.document_name,
      value: item.document_name,
      category: item.document_category || "",
    };

    setSelectedDocType(docType);

    // For Visa documents with no number saved yet, fall back to the
    // passport number on file so it's never left blank.
    if (isVisaDocType(docType) && !item.document_no) {
      const passportDoc = getPassportDocument();
      setDocumentNumber(passportDoc?.document_no?.toUpperCase() || "");
    } else {
      setDocumentNumber(item.document_no || "");
    }

    if (item.document_expiry) {
      const d = parseApiExpiryDate(item.document_expiry);
      if (d) setExpirationDate(d);
    }

    if (item.file) {
      setUploadedFilePath(item.file);
    }

    // Set verified state
    if (isVerifiableDocType(docType)) {
      setIsVerified(!!(item.document_no && item.document_expiry));
    } else {
      setIsVerified(true); // Non-verifiable = always ready to save
    }

    setModalVisible(true);
  };

  const openFile = async (file?: string | null) => {
    const url = getFileUrl(file);
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Toast.show({
          type: "error",
          text1: "Cannot open file",
          position: "bottom",
        });
      }
    } catch {
      Toast.show({
        type: "error",
        text1: "Failed to open file",
        position: "bottom",
      });
    }
  };

  const handleUpload = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "mixed",
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.type || !ALLOWED_FILE_TYPES.includes(asset.type)) {
        Toast.show({
          type: "error",
          text1: "Unsupported file type",
          position: "bottom",
        });
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Toast.show({
          type: "error",
          text1: "File too large (Max 5MB)",
          position: "bottom",
        });
        return;
      }
      const file = {
        uri: asset.uri!,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `file_${Date.now()}`,
      };
      setSelectedFile(file);
      setFileError("");
      setUploading(true);
      const uploaded = await uploadFile(file);
      const filePath = uploaded?.url || uploaded?.path || uploaded?.file || "";
      setUploadedFilePath(filePath);
      Toast.show({
        type: "success",
        text1: "File uploaded successfully",
        position: "bottom",
      });
    } catch {
      Toast.show({ type: "error", text1: "Upload failed", position: "bottom" });
    } finally {
      setUploading(false);
    }
  };

  // ─── Parse Expiry Date - Enhanced for multiple formats ─────────────────────
  const parseApiExpiryDate = (value: string): Date | null => {
    if (!value) return null;

    // DD/MM/YYYY
    const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return isNaN(d.getTime()) ? null : d;
    }

    // DD-MM-YYYY (New format from Visa check)
    const ddmmyyyyDash = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (ddmmyyyyDash) {
      const [, dd, mm, yyyy] = ddmmyyyyDash;
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

    // Fallback
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  // ─── Handle Verify Document - Updated ─────────────────────────────────────
  const handleVerifyDocument = async () => {
    if (!selectedDocType) {
      Toast.show({
        type: "error",
        text1: "Please select document type",
        position: "bottom",
      });
      return;
    }

    if (!documentNumber.trim()) {
      setDocNumberError("Please enter document number");
      Toast.show({
        type: "error",
        text1: "Please enter document number",
        position: "bottom",
      });
      return;
    }

    const docNameLower = (selectedDocType.label || selectedDocType.value || "")
      .toLowerCase()
      .trim();
    const isVisa = docNameLower.includes("visa");

    try {
      setVerifying(true);
      setExpiryError("");
      const token = await AsyncStorage.getItem("@auth_token");
      let response;

      if (isVisa) {
        // ── VISA VERIFICATION ─────────────────────────────────────
        let profile = userProfile;
        if (!profile) {
          const uid = userId || (await AsyncStorage.getItem("@user_id"));
          if (uid) {
            const res = await getUserProfile(uid);
            if (res?.success && res?.data) {
              profile = res.data;
              setUserProfile(res.data);
            }
          }
        }

        if (!profile) {
          Toast.show({
            type: "error",
            text1: "Unable to load profile for verification",
            position: "bottom",
          });
          setVerifying(false);
          return;
        }

        const { given_name, family_name } = splitName(profile?.name);

        // STRICT: Visa verification uses the user's Country of Origin,
        // not their current residential/address country.
        const rawOriginCountry =
          profile?.origin_country ||
          profile?.originCountry ||
          profile?.country_of_origin ||
          profile?.staff?.origin_country ||
          profile?.contractor?.origin_country ||
          "";

        const rawDob =
          profile?.dob ||
          profile?.date_of_birth ||
          profile?.staff?.dob ||
          profile?.staff?.date_of_birth ||
          profile?.contractor?.dob ||
          profile?.contractor?.date_of_birth ||
          "";

        const dob = normalizeDobToISO(rawDob);

        if (!rawOriginCountry) {
          Toast.show({
            type: "error",
            text1: "Country of Origin missing",
            text2: "Please add your Country of Origin in Profile first.",
            position: "bottom",
          });
          setVerifying(false);
          navigation.navigate("ProfileSetup");
          return;
        }

        if (!dob) {
          Toast.show({
            type: "error",
            text1: "Date of Birth missing",
            text2: "Please add your Date of Birth in Profile first.",
            position: "bottom",
          });
          setVerifying(false);
          navigation.navigate("ProfileSetup");
          return;
        }

        const originCountryCode = getCountryCode(rawOriginCountry);

        const payload = {
          passport: documentNumber.trim(),
          country: originCountryCode,
          family_name,
          given_name,
          dob,
        };

        console.log("Payload:", JSON.stringify(payload, null, 2));

        response = await axios.post(
          `${BASE_URL}/admin/visa-expiry-check`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
      } else {
        // Security License verification...
        const payload = {
          document_type: selectedDocType.label,
          license_number: documentNumber.trim(),
        };

        console.log("Payload:", JSON.stringify(payload, null, 2));

        response = await axios.post(
          `${Api_Url}/documents-online-verification-staffoo`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
      }

      console.log("VERIFY RESPONSE:", JSON.stringify(response?.data, null, 2));

      const data = response?.data;

      if (data?.success === false) {
        setIsVerified(false);
        setExpirationDate(null);
        Toast.show({
          type: "error",
          text1: data?.message || "Document verification failed",
          position: "bottom",
        });
        return;
      }

      // ── On a successful VISA check, fetch the full result using the
      //    dynamic verification id returned in the response ────────────
      if (isVisa) {
        const verificationId =
          data?.id ||
          data?.verification_id ||
          data?.check_id ||
          data?.vc_id ||
          data?.data?.id ||
          data?.data?.verification_id ||
          data?.data?.check_id ||
          data?.data?.vc_id;

        if (verificationId) {
          try {
            const resultResponse = await axios.get(
              `${BASE_URL}/admin/visa-result/${verificationId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );
            console.log(
              "VISA RESULT RESPONSE:",
              JSON.stringify(resultResponse?.data, null, 2),
            );
          } catch (resultErr: any) {
            console.log(
              "❌ Visa result fetch failed:",
              JSON.stringify(resultErr?.response?.data, null, 2),
            );
          }
        } else {
          console.log(
            "⚠️ No verification id found in visa-check response — skipping visa-result call.",
          );
        }
      }

      // ── NEW: Support for expired_at in nested data ─────────────────────
      const expiryRaw =
        data?.expiry ||
        data?.expiry_date ||
        data?.document_expiry ||
        data?.expired_at || // ← New
        data?.data?.expiry ||
        data?.data?.expiry_date ||
        data?.data?.document_expiry ||
        data?.data?.expired_at; // ← New (Most important)

      if (expiryRaw) {
        const dateObj = parseApiExpiryDate(expiryRaw);
        if (dateObj) {
          setExpirationDate(dateObj);
          setIsVerified(true);
          setShowExpiryPicker(false);

          Toast.show({
            type: "success",
            text1: data?.message || "Document verified successfully",
            position: "bottom",
          });
          return;
        }
      }

      // Fallback if no expiry found
      setIsVerified(false);
      setExpirationDate(null);
      setExpiryError("Could not process expiration date from verification");
      Toast.show({
        type: "error",
        text1: "Verification successful but expiry date not found",
        position: "bottom",
      });
    } catch (error: any) {
      console.log("=== VERIFY ERROR ===");
      console.log(JSON.stringify(error?.response?.data, null, 2));

      setIsVerified(false);
      setExpirationDate(null);

      Toast.show({
        type: "error",
        text1:
          error?.response?.data?.message ||
          error?.message ||
          "Document verification failed",
        position: "bottom",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleExpiryDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowExpiryPicker(false);
    if (event?.type === "dismissed") return;
    if (date) {
      setExpirationDate(date);
      setExpiryError("");
    }
  };

  const handleSave = async () => {
    let hasError = false;
    setFileError("");
    setDocNumberError("");
    setExpiryError("");

    if (!selectedFile && !uploadedFilePath) {
      setFileError("Please upload a file");
      hasError = true;
    }
    if (!documentNumber.trim()) {
      setDocNumberError("Please fill the document number");
      hasError = true;
    }

    if (needsVerification) {
      // ONLY visa documents & Security License must be verified online first.
      if (!isVerified || !expirationDate) {
        Toast.show({
          type: "error",
          text1: "Please verify document first",
          position: "bottom",
        });
        return;
      }
    } else if (!expirationDate) {
      // All other documents simply need an expiry date picked manually.
      setExpiryError("Please select an expiry date");
      hasError = true;
    }

    if (hasError) {
      Toast.show({
        type: "error",
        text1: "Please fill all mandatory fields",
        position: "bottom",
      });
      return;
    }

    setSaving(true);
    try {
      let fileName = "";
      if (uploadedFilePath) {
        fileName = uploadedFilePath.split("/").pop() || uploadedFilePath;
      } else if (selectedFile?.name) {
        fileName = selectedFile.name;
      } else {
        fileName = "unknown_file";
      }

      const year = expirationDate!.getFullYear();
      const month = String(expirationDate!.getMonth() + 1).padStart(2, "0");
      const day = String(expirationDate!.getDate()).padStart(2, "0");
      const expDate = `${year}-${month}-${day}`;

      const existingDoc = uploadedDocuments.find((d) => {
        const apiName =
          d.document_name?.toLowerCase().replace(/[\s_]+/g, "") || "";
        const apiType =
          d.document_type?.toLowerCase().replace(/[\s_]+/g, "") || "";
        const matchValue = selectedDocType!.value
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        return apiName === matchValue || apiType === matchValue;
      });

      const payload: any = {
        user_id: userId,
        document_no: documentNumber.trim(),
        document_expiry: expDate,
        file: fileName,
        document_category: selectedDocType!.category,
      };

      if (existingDoc) {
        payload.id = existingDoc.id;
        payload.document_name =
          existingDoc.document_name || selectedDocType!.value;
        payload.document_type =
          existingDoc.document_type ||
          selectedDocType!.value.toLowerCase().replace(/\s+/g, "_");
        payload.exp = (existingDoc as any).exp ?? false;
        payload.no = (existingDoc as any).no ?? false;
      } else {
        payload.document_name = selectedDocType!.value;
        payload.document_type = selectedDocType!.value
          .toLowerCase()
          .replace(/\s+/g, "_");
        payload.exp = false;
        payload.no = false;
      }

      const token = await AsyncStorage.getItem("@auth_token");
      await axios.post(`${BASE_URL}/guard-update-documents`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      Toast.show({
        type: "success",
        text1: "Document Saved Successfully",
        position: "bottom",
      });
      setModalVisible(false);
      loadData();
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Save Failed", position: "bottom" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Modal File Preview ───────────────────────────────────────────────────

  const renderModalPreview = () => {
    const fileUri =
      selectedFile?.uri ||
      (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
    const fileMime = selectedFile?.type || null;
    const fileName =
      selectedFile?.name || uploadedFilePath?.split("/").pop() || "Document";

    if (!fileUri) {
      return (
        <View style={styles.imagePlaceholder}>
          <View style={styles.errorPreviewContainer}>
            <CloudUpload size={48} color={THEME.textMuted} />
            <Text style={styles.previewText}>No file uploaded yet</Text>
          </View>
        </View>
      );
    }

    const isImage = isImageFile(fileUri, fileMime);

    if (isImage) {
      return (
        <View style={styles.imagePlaceholder}>
          <LazyImage uri={fileUri} style={styles.previewImage} />
        </View>
      );
    }

    // PDF / DOC / Other files
    return (
      <View style={styles.docPreviewCard}>
        <View style={styles.docPreviewIconWrap}>
          <FileText size={48} color={THEME.teal} />
        </View>
        <Text style={styles.docPreviewLabel} numberOfLines={2}>
          {fileName}
        </Text>
        <TouchableOpacity
          style={styles.viewDocButton}
          onPress={() => openFile(fileUri)}
          activeOpacity={0.8}
        >
          <ExternalLink size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.viewDocButtonText}>OPEN DOCUMENT</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Card: API-driven (filled state) ─────────────────────────────────────

  const renderFilledCard = (item: Document) => {
    const status = getExpiryStatus(item.document_expiry);
    const fileUrl = getFileUrl(item.file);
    const isImg = isImageFile(item.file);
    const ext = item.file?.split(".").pop()?.toUpperCase() || "";

    return (
      <LinearGradient
        colors={["#1e2538", "#141929"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.docIconBox}>
            <FileText size={22} color={THEME.teal} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.cardDocName} numberOfLines={1}>
              {getDisplayName(item.document_name)}
            </Text>
            <View style={styles.cardSubRow}>
              {!!ext && (
                <View style={styles.extBadge}>
                  <Text style={styles.extBadgeText}>{ext}</Text>
                </View>
              )}
              <ExpiryBadge status={status} />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Document Number</Text>
          <Text style={styles.infoValue}>{item.document_no || "—"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expiration Date</Text>
          <Text style={styles.infoValue}>
            {formatAUDate(item.document_expiry)}
          </Text>
        </View>

        {/* File Status */}
        {!item.file && (
          <Text style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>
            File missing (404)
          </Text>
        )}

        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[styles.viewBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => openFile(item.file)}
            activeOpacity={0.85}
          >
            <Eye size={17} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.viewBtnText}>
              {isImg ? "VIEW IMAGE" : "VIEW / DOWNLOAD"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editBtn, { flex: 1 }]}
            onPress={() => handleOpenEditModal(item)}
            activeOpacity={0.85}
          >
            <Pencil size={16} color={THEME.teal} style={{ marginRight: 8 }} />
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  // ─── Card: API-driven (empty state) ──────────────────────────────────────

  const renderEmptyCard = (item: Document) => (
    <LinearGradient
      colors={["#171d30", "#0f1322"]}
      style={[
        styles.cardGradient,
        {
          borderStyle: "dashed",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        },
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.docIconBox,
            { backgroundColor: "rgba(255,255,255,0.03)" },
          ]}
        >
          <FileText size={22} color={THEME.textMuted} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.cardDocName, { color: THEME.textMuted }]}>
            {getDisplayName(item.document_name)}
          </Text>
          <Text style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
            Add Required Document
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addCardButton}
        onPress={() =>
          handleOpenAddModal({
            label: item.document_name,
            value: item.document_name,
            category: item.document_category || item.document_type,
          })
        }
        activeOpacity={0.8}
      >
        <PlusCircle size={16} color={THEME.teal} style={{ marginRight: 6 }} />
        <Text style={styles.addCardButtonText}>ADD DOCUMENT</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderItem = ({ item }: { item: Document }) => {
    const isFilled = !!(item.file && item.file.trim().length > 0);
    return isFilled ? renderFilledCard(item) : renderEmptyCard(item);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingDocs ? (
        <ActivityIndicator
          size="large"
          color={THEME.teal}
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={uploadedDocuments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No documents found</Text>
          }
        />
      )}

      {/* ── Upload Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {getDisplayName(
                  selectedDocType?.label || selectedDocType?.value,
                )}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* File upload block */}
              <View style={styles.imageUploadArea}>
                {renderModalPreview()}
                <TouchableOpacity
                  style={styles.uploadTriggerButton}
                  onPress={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <CloudUpload
                        size={22}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.uploadTriggerText}>
                        {selectedFile || uploadedFilePath
                          ? "REPLACE FILE"
                          : "UPLOAD FILE (IMAGE, PDF, DOC) *"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {fileError ? (
                  <Text style={styles.errorText}>{fileError}</Text>
                ) : null}
              </View>
              {/* Document type — informational only, never locked */}
              {/* <Text style={styles.fieldLabel}>DOCUMENT TYPE</Text>
              <View style={styles.dropdownSelector}>
                <Text style={styles.dropdownText}>
                  {selectedDocType ? selectedDocType.label : ""}
                </Text>
              </View> */}
              {/* Document type — informational only, never locked */}
              <Text style={styles.fieldLabel}>DOCUMENT TYPE</Text>
              <View style={styles.dropdownSelector}>
                <Text style={styles.dropdownText}>
                  {selectedDocType
                    ? getDisplayName(
                        selectedDocType.label || selectedDocType.value,
                      )
                    : ""}
                </Text>
              </View>
              {/* Document Number */}
              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
                DOCUMENT NUMBER *
              </Text>
              {/* STRICT: Show verify button ONLY for Visa and Security License documents */}
              {needsVerification ? (
                <View style={{ flexDirection: "row" }}>
                  <TextInput
                    style={[
                      styles.inputBox,
                      {
                        flex: 1,
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                      },
                    ]}
                    placeholder="Enter document number"
                    placeholderTextColor={THEME.textMuted}
                    value={documentNumber}
                    maxLength={DOC_NO_MAX}
                    autoCapitalize="characters"
                    onChangeText={(text) => {
                      const formattedText = text.toUpperCase();
                      setDocumentNumber(formattedText);
                      setIsVerified(false);
                      setExpirationDate(null);
                      setExpiryError("");
                    }}
                  />

                  <TouchableOpacity
                    style={styles.verifyButton}
                    disabled={verifying}
                    onPress={handleVerifyDocument}
                  >
                    {verifying ? (
                      <ActivityIndicator color={THEME.teal} />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={styles.inputBox}
                  placeholder="Enter document number"
                  placeholderTextColor={THEME.textMuted}
                  value={documentNumber}
                  maxLength={DOC_NO_MAX}
                  autoCapitalize="characters"
                  onChangeText={(text) => setDocumentNumber(text.toUpperCase())}
                />
              )}
              {docNumberError ? (
                <Text style={styles.errorText}>{docNumberError}</Text>
              ) : null}
              {/* Show helper text ONLY for verifiable documents that aren't verified yet */}
              {needsVerification && !isVerified && (
                <Text style={styles.inputHelpText}>
                  Tap "Verify" to validate this document and auto-fill its
                  expiry date.
                </Text>
              )}
              {/* Expiration Date */}
              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
                EXPIRATION DATE *
              </Text>

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  isExpiryLocked && styles.dateButtonDisabled,
                ]}
                activeOpacity={isExpiryLocked ? 1 : 0.8}
                disabled={isExpiryLocked}
                onPress={() => {
                  if (!isExpiryLocked) {
                    setShowExpiryPicker(true);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dateText,
                    { color: expirationDate ? "#fff" : THEME.textMuted },
                  ]}
                >
                  {expirationDate
                    ? formatAUDate(expirationDate)
                    : needsVerification
                    ? "Verify document to auto-fill expiry date"
                    : "Tap to select expiry date"}
                </Text>

                {isExpiryLocked ? (
                  <Lock size={16} color={THEME.textMuted} />
                ) : (
                  <CalendarDays size={16} color={THEME.teal} />
                )}
              </TouchableOpacity>

              {/* Help Messages */}
              {isExpiryLocked && (
                <Text style={styles.inputHelpText}>
                  Auto-filled from verification — cannot be edited manually.
                </Text>
              )}

              {expiryError ? (
                <Text style={styles.errorText}>{expiryError}</Text>
              ) : null}

              {/* Date Picker - Only show for non-locked documents */}
              {showExpiryPicker && !isExpiryLocked && (
                <DateTimePicker
                  value={expirationDate || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleExpiryDateChange}
                />
              )}
              {Platform.OS === "ios" && showExpiryPicker && !isExpiryLocked && (
                <TouchableOpacity
                  style={styles.iosPickerDoneButton}
                  onPress={() => setShowExpiryPicker(false)}
                >
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>SAVE DOCUMENT</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Toast rendered INSIDE the Modal so it appears ABOVE the modal content.
            RN Modal is a separate native window layer — the app-level <Toast />
            (usually mounted in App.tsx) gets covered by this Modal, so we mount
            a second Toast instance here, scoped to this Modal's layer. */}
        <Toast />
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stylesheet ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background, paddingTop: 25 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  listContent: { padding: 16, paddingBottom: 40 },
  emptyText: {
    textAlign: "center",
    marginTop: 60,
    color: THEME.textMuted,
    fontSize: 15,
  },

  // ── Cards ──
  cardGradient: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(137,231,208,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardDocName: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  cardSubRow: {
    flexDirection: "row",
    marginTop: 4,
    alignItems: "center",
    gap: 8,
  },
  extBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  extBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(137,231,208,0.08)",
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.2)",
  },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: { color: THEME.textMuted, fontSize: 13 },
  infoValue: { color: "#fff", fontSize: 13, fontWeight: "500" },
  cardActionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  viewBtn: {
    backgroundColor: THEME.accent,
    height: 40,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  editBtn: {
    height: 40,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(137,231,208,0.08)",
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.25)",
  },
  editBtnText: { color: THEME.teal, fontSize: 13, fontWeight: "bold" },
  addCardButton: {
    height: 38,
    backgroundColor: "rgba(137,231,208,0.08)",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.2)",
  },
  addCardButtonText: { color: THEME.teal, fontSize: 12, fontWeight: "bold" },

  // ── Badges ──
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeExpired: { backgroundColor: "rgba(255,107,107,0.15)" },
  badgeExpiringSoon: { backgroundColor: "rgba(240,165,0,0.15)" },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  badgeTextExpired: { color: "#ff6b6b" },
  badgeTextExpiringSoon: { color: "#f0a500" },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: THEME.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 12,
  },
  modalBody: { padding: 16 },

  imageUploadArea: { alignItems: "center", marginBottom: 20 },
  imagePlaceholder: {
    width: width - 64,
    height: 160,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  previewImage: { width: "100%", height: "100%" },
  uploadTriggerButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "dashed",
    width: "100%",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadTriggerText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  previewText: { color: "#fff" },
  docPreviewCard: {
    width: "100%",
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  docPreviewIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(137,231,208,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  docPreviewLabel: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  viewDocButton: {
    flexDirection: "row",
    backgroundColor: THEME.accent,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  viewDocButtonText: { color: "#fff", fontSize: 11, fontWeight: "bold" },

  fieldLabel: {
    color: THEME.teal,
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 14,
  },
  verifyButton: {
    width: 110,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  verifyButtonText: { color: THEME.teal, fontWeight: "bold", fontSize: 14 },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateText: { color: "#fff", fontSize: 14 },
  dateButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: "rgba(255,255,255,0.05)",
  },
  errorText: { color: "#ff6b6b", fontSize: 12, marginTop: 4 },

  iosPickerDoneButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "rgba(137,231,208,0.12)",
  },
  iosPickerDoneText: { color: THEME.teal, fontWeight: "bold", fontSize: 13 },

  dropdownSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dropdownText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  inputHelpText: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },

  saveButton: {
    backgroundColor: THEME.accent,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
    borderRadius: 8,
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  errorPreviewContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(138, 135, 135, 0.2)",
    width: "100%",
    height: "100%",
  },

  errorPreviewText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },

  errorPreviewSubtext: {
    color: THEME.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
