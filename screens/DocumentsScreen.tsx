// import React, { useState, useEffect, useMemo } from "react";
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
//   ChevronRight,
//   AlertTriangle,
//   AlertCircle,
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
// const FILE_BASE_URL = "https://apis-staging.staffoo.com.au/staff_documents/";
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
//   working_rights?: string | null;
// };

// const THEME = {
//   background: "#030508",

//   accent: "#366bf0",
//   teal: "#89E7D0",
//   textLight: "#FFFFFF",
//   textMuted: "#6C7A89",
//   border: "rgba(255, 255, 255, 0.1)",

//   tealDark: "#0077b6",
//   bgDark: "#141929",
//   cardBg: "#1e2538",

//   textMain: "#ffffff",

//   error: "#ff6b6b",
//   success: "#2ec4b6",
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

// const VERIFIABLE_DOCUMENT_NAMES = ["visa", "security license"];
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

// type StateTab = { code: string; label: string; category: string };

// const STATE_TAB_CONFIG: StateTab[] = [
//   { code: "vic", label: "Victoria", category: "contractor_document" },
//   { code: "nsw", label: "New South Wales", category: "nsw_document" },
//   { code: "qld", label: "Queensland", category: "qld_document" },
//   { code: "tas", label: "Tasmania", category: "tas_document" },
//   { code: "wa", label: "Western Australia", category: "wa_document" },
//   { code: "sa", label: "South Australia", category: "sa_document" },
// ];

// const parseStatesAllowed = (raw: unknown): string[] => {
//   if (!raw) return [];
//   if (Array.isArray(raw)) {
//     return raw.map((s) => String(s).toLowerCase().trim());
//   }
//   if (typeof raw === "string") {
//     try {
//       const parsed = JSON.parse(raw);
//       if (Array.isArray(parsed)) {
//         return parsed.map((s) => String(s).toLowerCase().trim());
//       }
//     } catch {
//       return raw
//         .split(",")
//         .map((s) =>
//           s
//             .replace(/[\[\]"]/g, "")
//             .trim()
//             .toLowerCase(),
//         )
//         .filter(Boolean);
//     }
//   }
//   return [];
// };

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

// const parseApiExpiryDate = (value: string): Date | null => {
//   if (!value) return null;
//   const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
//   if (ddmmyyyy) {
//     const [, dd, mm, yyyy] = ddmmyyyy;
//     const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//     return isNaN(d.getTime()) ? null : d;
//   }
//   const ddmmyyyyDash = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
//   if (ddmmyyyyDash) {
//     const [, dd, mm, yyyy] = ddmmyyyyDash;
//     const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//     return isNaN(d.getTime()) ? null : d;
//   }
//   const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//   if (yyyymmdd) {
//     const [, yyyy, mm, dd] = yyyymmdd;
//     const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
//     return isNaN(d.getTime()) ? null : d;
//   }
//   const d = new Date(value);
//   return isNaN(d.getTime()) ? null : d;
// };

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
//         </View>
//       )}
//     </View>
//   );
// };

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

// export default function DocumentsScreen({ navigation }: Props) {
//   const [modalVisible, setModalVisible] = useState(false);
//   const [fileError, setFileError] = useState("");
//   const [docNumberError, setDocNumberError] = useState("");
//   const [expiryError, setExpiryError] = useState("");
//   const [incompleteModalVisible, setIncompleteModalVisible] = useState(false);
//   // Shown at the top of the list when user taps Next while docs are incomplete
//   const [showIncompleteTopBanner, setShowIncompleteTopBanner] = useState(false);
//   const [selectedDocType, setSelectedDocType] = useState<{
//     label: string;
//     value: string;
//     category: string;
//   } | null>(null);
//   const [verifying, setVerifying] = useState(false);
//   const [isVerified, setIsVerified] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);
//   const [documentNumber, setDocumentNumber] = useState("");
//   const [visaGrantNumber, setVisaGrantNumber] = useState("");
//   const [visaGrantNumberError, setVisaGrantNumberError] = useState("");
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
//   const [selectedStateCategory, setSelectedStateCategory] = useState<
//     string | null
//   >(null);

//   const [showWorkDocument, setShowWorkDocument] = useState(false);
//   const [workEntitlement, setWorkEntitlement] = useState<string | null>(null);
//   const [workRightsFile, setWorkRightsFile] = useState<any>(null);
//   const [workRightsFilePath, setWorkRightsFilePath] = useState<string | null>(
//     null,
//   );
//   const [uploadingWorkRights, setUploadingWorkRights] = useState(false);
//   const [workRightsError, setWorkRightsError] = useState("");

//   const SHARED_DOC_MATCHERS = [
//     (key: string) => key.includes("public liability"),
//     (key: string) =>
//       key.includes("security") &&
//       (key.includes("membership") || key.includes("member")),
//     (key: string) => key.includes("asic"),
//   ];

//   const normalizeDocKey = (name?: string) =>
//     (name || "").toLowerCase().trim().replace(/\s+/g, " ");

//   const isSharedDocumentType = (name?: string): boolean => {
//     const key = normalizeDocKey(name);
//     return SHARED_DOC_MATCHERS.some((fn) => fn(key));
//   };

//   /** Same shared type, any category, with a real file */
//   const findSharedUploadedDoc = (
//     docs: Document[],
//     docName?: string,
//     excludeCategory?: string | null,
//   ): Document | undefined => {
//     if (!isSharedDocumentType(docName)) return undefined;
//     const key = normalizeDocKey(docName);

//     return docs.find((other) => {
//       if (excludeCategory && other.document_category === excludeCategory) {
//         return false;
//       }
//       if (!other.file || !String(other.file).trim()) return false;
//       const otherKey = normalizeDocKey(other.document_name);
//       if (otherKey === key) return true;
//       return SHARED_DOC_MATCHERS.some((fn) => fn(key) && fn(otherKey));
//     });
//   };

//   /** Fill empty state docs from an already-uploaded shared copy */
//   const withInheritedSharedFiles = (
//     stateDocs: Document[],
//     allDocs: Document[],
//     stateCategory: string | null,
//   ): Document[] =>
//     stateDocs.map((doc) => {
//       if (doc.file && String(doc.file).trim()) return doc;

//       const shared = findSharedUploadedDoc(
//         allDocs,
//         doc.document_name,
//         stateCategory,
//       );
//       if (!shared) return doc;

//       return {
//         ...doc,
//         file: shared.file,
//         document_no: doc.document_no || shared.document_no,
//         document_expiry: doc.document_expiry || shared.document_expiry,
//         working_rights: doc.working_rights || shared.working_rights,
//         _inheritedFrom: shared.document_category,
//       } as Document & { _inheritedFrom?: string };
//     });

//   const isVisaDocType = (opts: {
//     label?: string | null;
//     value?: string | null;
//   }): boolean => {
//     const name = (opts.label || opts.value || "").toLowerCase().trim();
//     return name === "visa" || name.includes("visa");
//   };

//   /** "Security Master License" — verification is only enabled for contractors */
//   const isSecurityMasterLicenseDocType = (opts: {
//     label?: string | null;
//     value?: string | null;
//   }): boolean => {
//     const name = (opts.label || opts.value || "").toLowerCase().trim();
//     return (
//       name === "security master license" ||
//       name.includes("security master license")
//     );
//   };

//   const isContractor =
//     (userProfile?.user_type || "").toLowerCase().trim() === "contractor";

//   /**
//    * A document type requires the "Verify" flow when:
//    *  - it's in the always-verifiable list (visa, security license), OR
//    *  - it's "Security Master License" AND the current user is a contractor
//    */
//   const docTypeNeedsVerification = (
//     docType: { label?: string | null; value?: string | null } | null,
//   ): boolean => {
//     if (!docType) return false;
//     if (isVerifiableDocType(docType)) return true;
//     if (isContractor && isSecurityMasterLicenseDocType(docType)) return true;
//     return false;
//   };

//   const needsVerification = selectedDocType
//     ? docTypeNeedsVerification(selectedDocType)
//     : false;

//   const isVisaSelected = selectedDocType
//     ? isVisaDocType(selectedDocType)
//     : false;

//   const isExpiryLocked = needsVerification;

//   const contractorStateTabs = useMemo((): StateTab[] => {
//     if (!isContractor) return [];
//     const allowedCodes = parseStatesAllowed(userProfile?.states_allowed);
//     if (allowedCodes.length === 0) return [];
//     return STATE_TAB_CONFIG.filter((tab) => allowedCodes.includes(tab.code));
//   }, [isContractor, userProfile?.states_allowed]);

//   useEffect(() => {
//     if (!isContractor) {
//       setSelectedStateCategory(null);
//       return;
//     }
//     if (contractorStateTabs.length === 0) {
//       setSelectedStateCategory(null);
//       return;
//     }
//     const stillValid = contractorStateTabs.some(
//       (t) => t.category === selectedStateCategory,
//     );
//     if (!stillValid) {
//       setSelectedStateCategory(contractorStateTabs[0].category);
//     }
//   }, [isContractor, contractorStateTabs]);

//   const displayedDocuments = useMemo(() => {
//     if (!isContractor) return uploadedDocuments;
//     if (!selectedStateCategory) return uploadedDocuments;

//     return uploadedDocuments.filter(
//       (d) => d.document_category === selectedStateCategory,
//     );
//   }, [isContractor, uploadedDocuments, selectedStateCategory]);

//   const allRequiredStateDocuments = useMemo(() => {
//     if (!isContractor) return uploadedDocuments;

//     const allowedCategories = contractorStateTabs.map((t) => t.category);
//     if (allowedCategories.length === 0) return uploadedDocuments;

//     return uploadedDocuments.filter((d) =>
//       allowedCategories.includes(d.document_category || ""),
//     );
//   }, [isContractor, uploadedDocuments, contractorStateTabs]);

//   const profileCompletion = Number(
//     userProfile?.profile_completion_percentage ?? 0,
//   );

//   const haveAllRequiredDocs =
//     Array.isArray(allRequiredStateDocuments) &&
//     allRequiredStateDocuments.length > 0 &&
//     allRequiredStateDocuments.every(
//       (d) => !!(d.file && String(d.file).trim().length > 0),
//     );

//   const everyAllowedStateHasDocs = useMemo(() => {
//     if (!isContractor) return true;
//     if (contractorStateTabs.length === 0) return true;

//     return contractorStateTabs.every((tab) => {
//       const tabDocs = uploadedDocuments.filter(
//         (d) => d.document_category === tab.category,
//       );
//       if (tabDocs.length === 0) return false;

//       return tabDocs.every((d) => {
//         if (d.file && String(d.file).trim().length > 0) return true;
//         return !!findSharedUploadedDoc(
//           uploadedDocuments,
//           d.document_name,
//           tab.category,
//         );
//       });
//     });
//   }, [isContractor, contractorStateTabs, uploadedDocuments]);

//   const isProfileComplete = haveAllRequiredDocs && everyAllowedStateHasDocs;

//   /** Specific missing documents, grouped by state (raw names; display later) */
//   const missingDocumentsByState = useMemo(() => {
//     type MissingGroup = { stateLabel: string; items: string[] };
//     const groups: MissingGroup[] = [];

//     // Missing only if this document's own file is empty/null
//     const isDocMissing = (d: Document) =>
//       !(d.file && String(d.file).trim().length > 0);

//     if (isContractor && contractorStateTabs.length > 0) {
//       contractorStateTabs.forEach((tab) => {
//         const tabDocs = uploadedDocuments.filter(
//           (d) => d.document_category === tab.category,
//         );
//         const missing = tabDocs
//           .filter((d) => isDocMissing(d))
//           .map((d) => d.document_name || "Unknown document");

//         if (tabDocs.length === 0) {
//           groups.push({
//             stateLabel: tab.label,
//             items: ["No documents assigned for this state yet"],
//           });
//         } else if (missing.length > 0) {
//           groups.push({ stateLabel: tab.label, items: missing });
//         }
//       });
//     } else {
//       const missing = uploadedDocuments
//         .filter((d) => isDocMissing(d))
//         .map((d) => d.document_name || "Unknown document");
//       if (missing.length > 0) {
//         groups.push({ stateLabel: "Required documents", items: missing });
//       }
//     }

//     return groups;
//   }, [isContractor, contractorStateTabs, uploadedDocuments]);

//   const totalMissingCount = missingDocumentsByState.reduce(
//     (sum, g) => sum + g.items.length,
//     0,
//   );

//   const handleProceedRates = () => {
//     if (!isProfileComplete) {
//       // Show top banner asking user to complete required documents
//       setShowIncompleteTopBanner(true);
//       return;
//     }
//     setShowIncompleteTopBanner(false);
//     navigation.navigate("ContractorRates");
//   };

//   useEffect(() => {
//     loadData();
//   }, []);

//   // Hide top incomplete banner once all required docs are filled
//   useEffect(() => {
//     if (isProfileComplete) {
//       setShowIncompleteTopBanner(false);
//     }
//   }, [isProfileComplete]);

//   const isBridgingVisaStaff = (): boolean => {
//     const staffDocType =
//       userProfile?.staff?.staff_document_type ||
//       userProfile?.staff_document_type ||
//       "";
//     return staffDocType.toLowerCase().trim() === "bridging_visa";
//   };

//   const isBridgingVisaDocument = (): boolean => {
//     return !!(
//       selectedDocType &&
//       isVisaDocType(selectedDocType) &&
//       isBridgingVisaStaff()
//     );
//   };

//   const hideExpiryDate = showWorkDocument || isBridgingVisaDocument();

//   const getPassportDocument = (): Document | undefined => {
//     return userProfile?.documents?.find(
//       (d: Document) => d.document_name?.toLowerCase().trim() === "passport",
//     );
//   };
//   const toTitleCase = (text?: string) => {
//     if (!text) return "";
//     return text
//       .toLowerCase()
//       .replace(/_/g, " ") // convert underscores → spaces
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
//     "security license": "Security Licence",
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
//     "security master license": "Security Master License",
//     "public liability": "Public Liability",
//     workcover: "Workcover",
//     "labour hire": "Labour Hire",
//     "asic report": "ASIC Report",

//     // ── newly added ──
//     msic_card: "MSIC Card",
//     "msic card": "MSIC Card",
//     control_room_certificate: "Control Room Certificate",
//     "control room certificate": "Control Room Certificate",
//     ras_certificate: "RAS Certificate",
//     "ras certificate": "RAS Certificate",
//   };

//   const DOCUMENT_ORDER: Record<string, number> = {
//     passport: 1,
//     visa: 2,
//     "driver license front": 3,

//     "driver license back": 4,

//     "security license": 5,

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
//     "security master license": 13,
//     "public liability": 14,
//     workcover: 15,
//     "labour hire": 16,
//     "asic report": 17,
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
//     key = key.replace(/_/g, " "); // ras_certificate → ras certificate
//     key = key.replace(/check \(wwcc\)/i, "working with children");
//     key = key.replace(/\s+/g, " ");

//     // 1) Exact match first (keeps "certificate" in the key)
//     if (DOCUMENT_DISPLAY_NAME[key]) {
//       return DOCUMENT_DISPLAY_NAME[key];
//     }

//     // 2) Match without a trailing " certificate"
//     const withoutCert = key.replace(/\s*certificate\s*$/i, "").trim();
//     if (DOCUMENT_DISPLAY_NAME[withoutCert]) {
//       return DOCUMENT_DISPLAY_NAME[withoutCert];
//     }
//     if (DOCUMENT_DISPLAY_NAME[`${withoutCert} certificate`]) {
//       return DOCUMENT_DISPLAY_NAME[`${withoutCert} certificate`];
//     }

//     // 3) Fallback
//     return toTitleCase(docName);
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
//     setVisaGrantNumber("");
//     setVisaGrantNumberError("");
//     setExpirationDate(null);
//     setShowExpiryPicker(false);
//     setFileError("");
//     setDocNumberError("");
//     setExpiryError("");
//     setVerifying(false);
//     setIsVerified(false);
//     setIsEditing(false);

//     // ── Add these lines to hide the work rights section on reset ──
//     setShowWorkDocument(false);
//     setWorkEntitlement(null);
//     setWorkRightsFile(null);
//     setWorkRightsFilePath(null);
//     setUploadingWorkRights(false);
//     setWorkRightsError("");
//   };
//   const handleOpenAddModal = (docType: {
//     label: string;
//     value: string;
//     category: string;
//   }) => {
//     if (isVisaDocType(docType)) {
//       const passportDoc = getPassportDocument();
//       if (!passportDoc || !passportDoc.document_no) {
//         Toast.show({
//           type: "error",
//           text1: "Passport required",
//           text2: "Please add your Passport document first.",
//           position: "bottom",
//         });
//         return;
//       }
//     }

//     resetForm();
//     setIsEditing(false);
//     setSelectedDocType(docType);
//     setIsVerified(false);
//     setExpirationDate(null);

//     if (isVisaDocType(docType)) {
//       const passportDoc = getPassportDocument();
//       if (passportDoc?.document_no) {
//         setDocumentNumber(passportDoc.document_no.toUpperCase());
//       }
//     }

//     setModalVisible(true);
//   };
//   const handleOpenEditModal = (item: Document) => {
//     resetForm();
//     setIsEditing(true);

//     const docType = {
//       label: item.document_name,
//       value: item.document_name,
//       category: item.document_category || "",
//     };

//     setSelectedDocType(docType);

//     if (isVisaDocType(docType)) {
//       const passportDoc = getPassportDocument();
//       setDocumentNumber(passportDoc?.document_no?.toUpperCase() || "");
//       setVisaGrantNumber(item.document_no || "");
//     } else {
//       setDocumentNumber(item.document_no || "");
//     }

//     if (item.document_expiry) {
//       const d = parseApiExpiryDate(item.document_expiry);
//       if (d) setExpirationDate(d);
//     }

//     if (item.file) {
//       setUploadedFilePath(item.file);
//     }
//     if (isVisaDocType(docType) && item.working_rights) {
//       setWorkRightsFilePath(item.working_rights);
//     }

//     if (docTypeNeedsVerification(docType)) {
//       if (isVisaDocType(docType)) {
//         const passportDoc = getPassportDocument();
//         const hasPassportNumber = !!passportDoc?.document_no;
//         const bridging = isBridgingVisaStaff();
//         if (bridging) {
//           setIsVerified(
//             !!(
//               hasPassportNumber &&
//               (item.document_expiry || item.working_rights)
//             ),
//           );
//         } else {
//           setIsVerified(!!(hasPassportNumber && item.document_expiry));
//         }
//       } else {
//         setIsVerified(!!(item.document_no && item.document_expiry));
//       }
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

//   const handleWorkRightsUpload = async () => {
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
//         name: asset.fileName || `work_right_${Date.now()}`,
//       };
//       setWorkRightsFile(file);
//       setWorkRightsError("");
//       setUploadingWorkRights(true);
//       const uploaded = await uploadFile(file);
//       const filePath = uploaded?.url || uploaded?.path || uploaded?.file || "";
//       setWorkRightsFilePath(filePath);
//       Toast.show({
//         type: "success",
//         text1: "Work rights document uploaded successfully",
//         position: "bottom",
//       });
//     } catch {
//       Toast.show({
//         type: "error",
//         text1: "Work rights document upload failed",
//         position: "bottom",
//       });
//     } finally {
//       setUploadingWorkRights(false);
//     }
//   };

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
//       setDocNumberError(
//         isVisaSelected
//           ? "Please enter passport number"
//           : "Please enter document number",
//       );
//       Toast.show({
//         type: "error",
//         text1: isVisaSelected
//           ? "Please enter passport number"
//           : "Please enter document number",
//         position: "bottom",
//       });
//       return;
//     }

//     const docNameLower = (selectedDocType.label || selectedDocType.value || "")
//       .toLowerCase()
//       .trim();

//     const isVisa = docNameLower.includes("visa");
//     const isSecurityLicense = docNameLower.includes("security");

//     try {
//       setVerifying(true);
//       setExpiryError("");

//       // Clear previous work rights file states when re-verifying
//       setWorkRightsFile(null);
//       setWorkRightsFilePath(null);
//       setWorkRightsError("");

//       const token = await AsyncStorage.getItem("@auth_token");
//       let response;

//       if (isVisa) {
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

//         const rawOriginCountry =
//           profile?.origin_country ||
//           profile?.originCountry ||
//           profile?.country_of_origin ||
//           profile?.staff?.origin_country ||
//           profile?.contractor?.origin_country ||
//           "";

//         const rawDob =
//           profile?.dob ||
//           profile?.date_of_birth ||
//           profile?.staff?.dob ||
//           profile?.staff?.date_of_birth ||
//           profile?.contractor?.dob ||
//           profile?.contractor?.date_of_birth ||
//           "";

//         const dob = normalizeDobToISO(rawDob);

//         if (!rawOriginCountry) {
//           Toast.show({
//             type: "error",
//             text1: "Country of Birth missing",
//             text2: "Please add your Country of Birth in Profile first.",
//             position: "bottom",
//           });
//           setVerifying(false);
//           navigation.navigate("ProfileSetup");
//           return;
//         }

//         if (!dob) {
//           Toast.show({
//             type: "error",
//             text1: "Date of Birth missing",
//             text2: "Please add your Date of Birth in Profile first.",
//             position: "bottom",
//           });
//           setVerifying(false);
//           navigation.navigate("ProfileSetup");
//           return;
//         }

//         const originCountryCode = getCountryCode(rawOriginCountry);

//         const payload = {
//           passport: documentNumber.trim(),
//           country: originCountryCode,
//           family_name,
//           given_name,
//           dob,
//         };

//         console.log("📤 VISA Payload:", JSON.stringify(payload, null, 2));

//         response = await axios.post(
//           `${BASE_URL}/admin/visa-expiry-check`,
//           payload,
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//               "Content-Type": "application/json",
//             },
//           },
//         );
//       } else if (isSecurityLicense) {
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

//         const docLabel = (selectedDocType.label || selectedDocType.value || "")
//           .toLowerCase()
//           .trim();
//         const isSecurityMasterLicense =
//           docLabel === "security master license" ||
//           docLabel.includes("security master license");

//         const addressState =
//           profile?.state ||
//           profile?.staff?.state ||
//           profile?.contractor?.state ||
//           profile?.address_state ||
//           "";

//         const selectedTabState = contractorStateTabs.find(
//           (t) => t.category === selectedStateCategory,
//         )?.code;

//         const userState =
//           isSecurityMasterLicense && isContractor
//             ? String(selectedTabState || addressState).trim()
//             : (isContractor && selectedTabState) ||
//               String(addressState).trim() ||
//               "";

//         if (!userState) {
//           Toast.show({
//             type: "error",
//             text1: "State is required",
//             text2: "Please add your State / Address in Profile first",
//             position: "bottom",
//           });
//           setVerifying(false);
//           navigation.navigate("ProfileSetup");
//           return;
//         }

//         const payload = {
//           document_type: selectedDocType.label,
//           license_number: documentNumber.trim(),
//           state: userState,
//         };

//         console.log(
//           "📤 SECURITY LICENSE Payload:",
//           JSON.stringify(payload, null, 2),
//         );

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

//       console.log(
//         "✅ VERIFY RESPONSE:",
//         JSON.stringify(response?.data, null, 2),
//       );

//       const data = response?.data;

//       if (data?.success === false) {
//         setIsVerified(false);
//         setExpirationDate(null);
//         setShowWorkDocument(false);
//         setWorkEntitlement(null);
//         Toast.show({
//           type: "error",
//           text1: data?.message || "Document verification failed",
//           position: "bottom",
//         });
//         return;
//       }

//       if (isVisa) {
//         const shouldShowWorkDoc =
//           data?.show_document === true || data?.data?.show_document === true;

//         setShowWorkDocument(!!shouldShowWorkDoc);

//         const entitlement =
//           data?.work_entitlement || data?.data?.work_entitlement || null;
//         setWorkEntitlement(entitlement);

//         const expiryRaw =
//           data?.expiry ||
//           data?.expiry_date ||
//           data?.document_expiry ||
//           data?.expired_at ||
//           data?.data?.expiry ||
//           data?.data?.expiry_date ||
//           data?.data?.document_expiry ||
//           data?.data?.expired_at;

//         if (expiryRaw) {
//           const dateObj = parseApiExpiryDate(expiryRaw);
//           if (dateObj) {
//             setExpirationDate(dateObj);
//             setShowExpiryPicker(false);
//             setExpiryError("");
//           }
//         } else if (!shouldShowWorkDoc) {
//           setExpirationDate(null);
//         }

//         setIsVerified(true);

//         Toast.show({
//           type: "success",
//           text1: data?.message || "Document verified successfully",
//           position: "bottom",
//         });
//         return;
//       }

//       const expiryRaw =
//         data?.expiry ||
//         data?.expiry_date ||
//         data?.document_expiry ||
//         data?.expired_at ||
//         data?.data?.expiry ||
//         data?.data?.expiry_date ||
//         data?.data?.document_expiry ||
//         data?.data?.expired_at;

//       if (expiryRaw) {
//         const dateObj = parseApiExpiryDate(expiryRaw);
//         if (dateObj) {
//           setExpirationDate(dateObj);
//           setShowExpiryPicker(false);
//         }
//       } else {
//         setExpirationDate(null);
//       }
//       Toast.show({
//         type: "success",
//         text1: data?.message || "Document verified successfully",
//         position: "bottom",
//       });
//       return;
//     } catch (error: any) {
//       console.log("=== VERIFY ERROR ===");
//       console.log(JSON.stringify(error?.response?.data, null, 2));

//       setIsVerified(false);
//       setExpirationDate(null);
//       setShowWorkDocument(false);
//       setWorkEntitlement(null);

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

//   // const handleVerifyDocument = async () => {
//   //   if (!selectedDocType) {
//   //     Toast.show({
//   //       type: "error",
//   //       text1: "Please select document type",
//   //       position: "bottom",
//   //     });
//   //     return;
//   //   }

//   //   if (!documentNumber.trim()) {
//   //     setDocNumberError(
//   //       isVisaSelected
//   //         ? "Please enter passport number"
//   //         : "Please enter document number",
//   //     );
//   //     Toast.show({
//   //       type: "error",
//   //       text1: isVisaSelected
//   //         ? "Please enter passport number"
//   //         : "Please enter document number",
//   //       position: "bottom",
//   //     });
//   //     return;
//   //   }

//   //   const docNameLower = (selectedDocType.label || selectedDocType.value || "")
//   //     .toLowerCase()
//   //     .trim();

//   //   const isVisa = docNameLower.includes("visa");
//   //   // Covers both "Security License" and "Security Master License"
//   //   // (Security Master License verification is only ever surfaced to
//   //   // contractors — see docTypeNeedsVerification — but the API call
//   //   // itself is identical to the regular Security License flow).
//   //   const isSecurityLicense = docNameLower.includes("security");

//   //   try {
//   //     setVerifying(true);
//   //     setExpiryError("");
//   //     const token = await AsyncStorage.getItem("@auth_token");
//   //     let response;

//   //     if (isVisa) {
//   //       let profile = userProfile;
//   //       if (!profile) {
//   //         const uid = userId || (await AsyncStorage.getItem("@user_id"));
//   //         if (uid) {
//   //           const res = await getUserProfile(uid);
//   //           if (res?.success && res?.data) {
//   //             profile = res.data;
//   //             setUserProfile(res.data);
//   //           }
//   //         }
//   //       }

//   //       if (!profile) {
//   //         Toast.show({
//   //           type: "error",
//   //           text1: "Unable to load profile for verification",
//   //           position: "bottom",
//   //         });
//   //         setVerifying(false);
//   //         return;
//   //       }

//   //       const { given_name, family_name } = splitName(profile?.name);

//   //       const rawOriginCountry =
//   //         profile?.origin_country ||
//   //         profile?.originCountry ||
//   //         profile?.country_of_origin ||
//   //         profile?.staff?.origin_country ||
//   //         profile?.contractor?.origin_country ||
//   //         "";

//   //       const rawDob =
//   //         profile?.dob ||
//   //         profile?.date_of_birth ||
//   //         profile?.staff?.dob ||
//   //         profile?.staff?.date_of_birth ||
//   //         profile?.contractor?.dob ||
//   //         profile?.contractor?.date_of_birth ||
//   //         "";

//   //       const dob = normalizeDobToISO(rawDob);

//   //       if (!rawOriginCountry) {
//   //         Toast.show({
//   //           type: "error",
//   //           text1: "Country of Birth missing",
//   //           text2: "Please add your Country of Birth in Profile first.",
//   //           position: "bottom",
//   //         });
//   //         setVerifying(false);
//   //         navigation.navigate("ProfileSetup");
//   //         return;
//   //       }

//   //       if (!dob) {
//   //         Toast.show({
//   //           type: "error",
//   //           text1: "Date of Birth missing",
//   //           text2: "Please add your Date of Birth in Profile first.",
//   //           position: "bottom",
//   //         });
//   //         setVerifying(false);
//   //         navigation.navigate("ProfileSetup");
//   //         return;
//   //       }

//   //       const originCountryCode = getCountryCode(rawOriginCountry);

//   //       const payload = {
//   //         passport: documentNumber.trim(),
//   //         country: originCountryCode,
//   //         family_name,
//   //         given_name,
//   //         dob,
//   //       };

//   //       console.log("📤 VISA Payload:", JSON.stringify(payload, null, 2));

//   //       response = await axios.post(
//   //         `${BASE_URL}/admin/visa-expiry-check`,
//   //         payload,
//   //         {
//   //           headers: {
//   //             Authorization: `Bearer ${token}`,
//   //             "Content-Type": "application/json",
//   //           },
//   //         },
//   //       );
//   //     } else if (isSecurityLicense) {
//   //       let profile = userProfile;
//   //       if (!profile) {
//   //         const uid = userId || (await AsyncStorage.getItem("@user_id"));
//   //         if (uid) {
//   //           const res = await getUserProfile(uid);
//   //           if (res?.success && res?.data) {
//   //             profile = res.data;
//   //             setUserProfile(res.data);
//   //           }
//   //         }
//   //       }

//   //       const docLabel = (selectedDocType.label || selectedDocType.value || "")
//   //         .toLowerCase()
//   //         .trim();
//   //       const isSecurityMasterLicense =
//   //         docLabel === "security master license" ||
//   //         docLabel.includes("security master license");

//   //       // State from address / profile (what you asked for)
//   //       const addressState =
//   //         profile?.state ||
//   //         profile?.staff?.state ||
//   //         profile?.contractor?.state ||
//   //         profile?.address_state ||
//   //         "";

//   //       // Optional: tab state code (vic, nsw, …) as fallback for normal Security Licence
//   //       const selectedTabState = contractorStateTabs.find(
//   //         (t) => t.category === selectedStateCategory,
//   //       )?.code;

//   //       /**
//   //        * Security Master License (contractor) → send the selected state tab,
//   //        * because the document is being added for that state.
//   //        * Other security licences → tab code first, then address state.
//   //        */
//   //       const userState =
//   //         isSecurityMasterLicense && isContractor
//   //           ? String(selectedTabState || addressState).trim()
//   //           : (isContractor && selectedTabState) ||
//   //             String(addressState).trim() ||
//   //             "";

//   //       if (!userState) {
//   //         Toast.show({
//   //           type: "error",
//   //           text1: "State is required",
//   //           text2: "Please add your State / Address in Profile first",
//   //           position: "bottom",
//   //         });
//   //         setVerifying(false);
//   //         navigation.navigate("ProfileSetup");
//   //         return;
//   //       }

//   //       const payload = {
//   //         document_type: selectedDocType.label,
//   //         license_number: documentNumber.trim(),
//   //         state: userState,
//   //       };

//   //       console.log(
//   //         "📤 SECURITY LICENSE Payload:",
//   //         JSON.stringify(payload, null, 2),
//   //       );

//   //       response = await axios.post(
//   //         `${Api_Url}/documents-online-verification-staffoo`,
//   //         payload,
//   //         {
//   //           headers: {
//   //             Authorization: `Bearer ${token}`,
//   //             "Content-Type": "application/json",
//   //           },
//   //         },
//   //       );
//   //     }

//   //     console.log(
//   //       "✅ VERIFY RESPONSE:",
//   //       JSON.stringify(response?.data, null, 2),
//   //     );

//   //     const data = response?.data;

//   //     if (data?.success === false) {
//   //       setIsVerified(false);
//   //       setExpirationDate(null);
//   //       setShowWorkDocument(false);
//   //       setWorkEntitlement(null);
//   //       Toast.show({
//   //         type: "error",
//   //         text1: data?.message || "Document verification failed",
//   //         position: "bottom",
//   //       });
//   //       return;
//   //     }
//   //     if (isVisa) {
//   //       const shouldShowWorkDoc =
//   //         data?.show_document === true || data?.data?.show_document === true;

//   //       // This ensures it only shows after a successful verification check requires it
//   //       setShowWorkDocument(!!shouldShowWorkDoc);

//   //       const entitlement =
//   //         data?.work_entitlement || data?.data?.work_entitlement || null;
//   //       setWorkEntitlement(entitlement);

//   //       // Auto-fill expiry when the API returns one (e.g. show_document: false)
//   //       const expiryRaw =
//   //         data?.expiry ||
//   //         data?.expiry_date ||
//   //         data?.document_expiry ||
//   //         data?.expired_at ||
//   //         data?.data?.expiry ||
//   //         data?.data?.expiry_date ||
//   //         data?.data?.document_expiry ||
//   //         data?.data?.expired_at;

//   //       if (expiryRaw) {
//   //         const dateObj = parseApiExpiryDate(expiryRaw);
//   //         if (dateObj) {
//   //           setExpirationDate(dateObj);
//   //           setShowExpiryPicker(false);
//   //           setExpiryError("");
//   //         }
//   //       } else if (!shouldShowWorkDoc) {
//   //         // No expiry and not switching to work-rights upload
//   //         setExpirationDate(null);
//   //       }

//   //       setIsVerified(true);

//   //       Toast.show({
//   //         type: "success",
//   //         text1: data?.message || "Document verified successfully",
//   //         position: "bottom",
//   //       });
//   //       return;
//   //     }

//   //     const expiryRaw =
//   //       data?.expiry ||
//   //       data?.expiry_date ||
//   //       data?.document_expiry ||
//   //       data?.expired_at ||
//   //       data?.data?.expiry ||
//   //       data?.data?.expiry_date ||
//   //       data?.data?.document_expiry ||
//   //       data?.data?.expired_at;

//   //     if (expiryRaw) {
//   //       const dateObj = parseApiExpiryDate(expiryRaw);
//   //       if (dateObj) {
//   //         setExpirationDate(dateObj);
//   //         setShowExpiryPicker(false);
//   //       }
//   //     } else {
//   //       setExpirationDate(null);
//   //     }
//   //     Toast.show({
//   //       type: "success",
//   //       text1: data?.message || "Document verified successfully",
//   //       position: "bottom",
//   //     });
//   //     return;
//   //   } catch (error: any) {
//   //     console.log("=== VERIFY ERROR ===");
//   //     console.log(JSON.stringify(error?.response?.data, null, 2));

//   //     setIsVerified(false);
//   //     setExpirationDate(null);
//   //     setShowWorkDocument(false);
//   //     setWorkEntitlement(null);

//   //     Toast.show({
//   //       type: "error",
//   //       text1:
//   //         error?.response?.data?.message ||
//   //         error?.message ||
//   //         "Document verification failed",
//   //       position: "bottom",
//   //     });
//   //   } finally {
//   //     setVerifying(false);
//   //   }
//   // };

//   const isSelectedStateComplete = useMemo(() => {
//     if (!isContractor || !selectedStateCategory) return true;

//     const tabDocs = uploadedDocuments.filter(
//       (d) => d.document_category === selectedStateCategory,
//     );

//     if (tabDocs.length === 0) return false;

//     return tabDocs.every((d) => {
//       if (d.file && String(d.file).trim().length > 0) return true;
//       // also count shared documents as complete
//       return !!findSharedUploadedDoc(
//         uploadedDocuments,
//         d.document_name,
//         selectedStateCategory,
//       );
//     });
//   }, [isContractor, selectedStateCategory, uploadedDocuments]);

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
//     setVisaGrantNumberError("");
//     setExpiryError("");
//     setWorkRightsError("");

//     if (!selectedFile && !uploadedFilePath) {
//       setFileError("Please upload a file");
//       hasError = true;
//     }

//     if (isVisaSelected) {
//       if (!documentNumber.trim()) {
//         setDocNumberError("Please fill the passport number");
//         hasError = true;
//       }
//       if (!visaGrantNumber.trim()) {
//         setVisaGrantNumberError("Please fill the visa grant number");
//         hasError = true;
//       }
//     } else if (!documentNumber.trim()) {
//       setDocNumberError("Please fill the document number");
//       hasError = true;
//     }

//     if (needsVerification) {
//       // ONLY visa documents & Security License must be verified online first.
//       // if (!isVerified) {
//       //   Toast.show({
//       //     type: "error",
//       //     text1: "Please verify document first",
//       //     position: "bottom",
//       //   });
//       //   return;
//       // }

//       if (hideExpiryDate) {
//         if (!workRightsFile && !workRightsFilePath) {
//           setWorkRightsError("Please upload work rights document");
//           hasError = true;
//         }
//       } else if (!expirationDate) {
//         Toast.show({
//           type: "error",
//           text1: "Please select an expiry date",
//           position: "bottom",
//         });
//         return;
//       }
//     } else if (!expirationDate) {
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

//       let expDate = "";
//       if (expirationDate) {
//         const year = expirationDate.getFullYear();
//         const month = String(expirationDate.getMonth() + 1).padStart(2, "0");
//         const day = String(expirationDate.getDate()).padStart(2, "0");
//         expDate = `${year}-${month}-${day}`;
//       }

//       const savedDocumentNo = isVisaSelected
//         ? visaGrantNumber.trim()
//         : documentNumber.trim();

//       const existingDoc = uploadedDocuments.find((d) => {
//         const apiName =
//           d.document_name?.toLowerCase().replace(/[\s_]+/g, "") || "";
//         const apiType =
//           d.document_type?.toLowerCase().replace(/[\s_]+/g, "") || "";
//         const apiCategory = d.document_category || "";
//         const matchValue = selectedDocType!.value
//           .toLowerCase()
//           .replace(/[\s_]+/g, "");
//         const nameOrTypeMatches =
//           apiName === matchValue || apiType === matchValue;

//         if (isContractor && selectedDocType!.category) {
//           return nameOrTypeMatches && apiCategory === selectedDocType!.category;
//         }
//         return nameOrTypeMatches;
//       });

//       const payload: any = {
//         user_id: userId,
//         document_no: savedDocumentNo,
//         document_expiry: expDate,
//         file: fileName,
//         document_category: selectedDocType!.category,
//       };

//       if (hideExpiryDate) {
//         let workRightFileName = "";
//         if (workRightsFilePath) {
//           workRightFileName =
//             workRightsFilePath.split("/").pop() || workRightsFilePath;
//         } else if (workRightsFile?.name) {
//           workRightFileName = workRightsFile.name;
//         }
//         payload.working_rights = workRightFileName;
//       }

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

//   const renderFilePreview = (
//     fileUri: string | null,
//     fileMime: string | null,
//     fileName: string,
//     emptyLabel: string,
//   ) => {
//     if (!fileUri) {
//       return (
//         <View style={styles.imagePlaceholder}>
//           <View style={styles.errorPreviewContainer}>
//             <CloudUpload size={48} color={THEME.textMuted} />
//             <Text style={styles.previewText}>{emptyLabel}</Text>
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

//   const renderModalPreview = () => {
//     const fileUri =
//       selectedFile?.uri ||
//       (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
//     const fileMime = selectedFile?.type || null;
//     const fileName =
//       selectedFile?.name || uploadedFilePath?.split("/").pop() || "Document";

//     return renderFilePreview(
//       fileUri,
//       fileMime,
//       fileName,
//       "No file uploaded yet",
//     );
//   };

//   const renderWorkRightsPreview = () => {
//     const fileUri =
//       workRightsFile?.uri ||
//       (workRightsFilePath ? getFileUrl(workRightsFilePath) : null);
//     const fileMime = workRightsFile?.type || null;
//     const fileName =
//       workRightsFile?.name ||
//       workRightsFilePath?.split("/").pop() ||
//       "Work Rights Document";

//     return renderFilePreview(
//       fileUri,
//       fileMime,
//       fileName,
//       "No work rights document uploaded yet",
//     );
//   };

//   const renderFilledCard = (item: Document) => {
//     const status = getExpiryStatus(item.document_expiry);
//     const fileUrl = getFileUrl(item.file);
//     const isImg = isImageFile(item.file);
//     const ext = item.file?.split(".").pop()?.toUpperCase() || "";

//     return (
//       <LinearGradient
//         colors={["#1e2538", "#141929"]}
//         style={styles.cardGradientWrapper} // 1. Keep ONLY structural/radius bounds here
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//       >
//         {/* 2. Move padding and layout rules to this inner container */}
//         <View style={styles.cardInnerContainer}>
//           <View style={styles.cardTopRow}>
//             <View style={styles.docIconBox}>
//               <FileText size={22} color={THEME.teal} />
//             </View>
//             <View style={{ flex: 1, marginHorizontal: 12 }}>
//               <Text style={styles.cardDocName} numberOfLines={1}>
//                 {getDisplayName(item.document_name)}
//               </Text>
//               <View style={styles.cardSubRow}>
//                 {!!ext && (
//                   <View style={styles.extBadge}>
//                     <Text style={styles.extBadgeText}>{ext}</Text>
//                   </View>
//                 )}
//                 <ExpiryBadge status={status} />
//               </View>
//             </View>
//           </View>

//           <View style={styles.divider} />

//           <View style={styles.infoRow}>
//             <Text style={styles.infoLabel}>Document Number</Text>
//             <Text style={styles.infoValue} numberOfLines={1}>
//               {item.document_no || "—"}
//             </Text>
//           </View>
//           <View style={styles.infoRow}>
//             <Text style={styles.infoLabel}>Expiration Date</Text>
//             <Text style={styles.infoValue}>
//               {formatAUDate(item.document_expiry)}
//             </Text>
//           </View>

//           {!item.file && (
//             <Text style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>
//               File missing (404)
//             </Text>
//           )}

//           <View style={styles.cardActionsRow}>
//             <TouchableOpacity
//               style={styles.viewBtn}
//               onPress={() => openFile(item.file)}
//               activeOpacity={0.85}
//             >
//               <Eye size={17} color="#fff" style={{ marginRight: 6 }} />
//               <Text style={styles.viewBtnText}>
//                 {isImg ? "VIEW IMAGE" : "VIEW / DOWNLOAD"}
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.editBtn}
//               onPress={() => handleOpenEditModal(item)}
//               activeOpacity={0.85}
//             >
//               <Pencil size={16} color={THEME.teal} style={{ marginRight: 6 }} />
//               <Text style={styles.editBtnText}>EDIT</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </LinearGradient>
//     );
//   };

//   const renderEmptyCard = (item: Document) => {
//     // Empty / missing document card — no yellow dashed highlight.
//     // Add Document button uses a red border so missing items stand out.
//     const openAdd = () =>
//       handleOpenAddModal({
//         label: item.document_name,
//         value: item.document_name,
//         category: item.document_category || item.document_type,
//       });

//     return (
//       <LinearGradient
//         colors={["#171d30", "#0f1322"]}
//         style={[
//           styles.cardGradientWrapper,
//           {
//             borderStyle: "dashed",
//             borderWidth: 1,
//             borderColor: "rgba(255,255,255,0.08)",
//           },
//         ]}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//       >
//         <View style={styles.cardInnerContainer}>
//           <View style={styles.cardTopRow}>
//             <View
//               style={[
//                 styles.docIconBox,
//                 { backgroundColor: "rgba(255,255,255,0.03)" },
//               ]}
//             >
//               <FileText size={22} color={THEME.textMuted} />
//             </View>
//             <View style={{ flex: 1, marginHorizontal: 12 }}>
//               <View style={styles.emptyCardTitleRow}>
//                 <Text
//                   style={[
//                     styles.cardDocName,
//                     { color: THEME.textMuted, flex: 1 },
//                   ]}
//                 >
//                   {getDisplayName(item.document_name)}
//                 </Text>
//                 {isContractor && (
//                   <View style={styles.requiredBadge}>
//                     <Text style={styles.requiredBadgeText}>REQUIRED</Text>
//                   </View>
//                 )}
//               </View>
//               <Text style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
//                 Add Required Document
//               </Text>
//             </View>
//           </View>

//           <TouchableOpacity
//             style={[styles.addCardButton, styles.addCardButtonMissing]}
//             onPress={openAdd}
//             activeOpacity={0.8}
//           >
//             <PlusCircle size={16} color="#ff6b6b" style={{ marginRight: 6 }} />
//             <Text style={[styles.addCardButtonText, { color: "#ff6b6b" }]}>
//               ADD DOCUMENT
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </LinearGradient>
//     );
//   };

//   const renderItem = ({ item }: { item: Document }) => {
//     const isFilled = !!(item.file && item.file.trim().length > 0);
//     return isFilled ? renderFilledCard(item) : renderEmptyCard(item);
//   };

//   const renderStateTabs = () => {
//     if (!isContractor || contractorStateTabs.length === 0) return null;

//     // Sort: incomplete tabs first, complete tabs last
//     const sortedTabs = [...contractorStateTabs].sort((a, b) => {
//       const aDocs = uploadedDocuments.filter(
//         (d) => d.document_category === a.category,
//       );
//       const aComplete =
//         aDocs.length > 0 &&
//         aDocs.every((d) => !!(d.file && String(d.file).trim().length > 0));

//       const bDocs = uploadedDocuments.filter(
//         (d) => d.document_category === b.category,
//       );
//       const bComplete =
//         bDocs.length > 0 &&
//         bDocs.every((d) => !!(d.file && String(d.file).trim().length > 0));

//       // Incomplete (false) comes before complete (true)
//       if (aComplete === bComplete) return 0;
//       return aComplete ? 1 : -1;
//     });

//     return (
//       <View style={styles.tabBarWrapper}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.tabBarContent}
//         >
//           {sortedTabs.map((tab) => {
//             const isActive = tab.category === selectedStateCategory;
//             const tabDocs = uploadedDocuments.filter(
//               (d) => d.document_category === tab.category,
//             );
//             // Complete only when every doc for this state has its own file
//             const tabComplete =
//               tabDocs.length > 0 &&
//               tabDocs.every(
//                 (d) => !!(d.file && String(d.file).trim().length > 0),
//               );

//             return (
//               <TouchableOpacity
//                 key={tab.category}
//                 style={[styles.tabButton, isActive && styles.tabButtonActive]}
//                 activeOpacity={0.8}
//                 onPress={() => setSelectedStateCategory(tab.category)}
//               >
//                 <View
//                   style={[
//                     styles.tabCompletionDot,
//                     tabComplete
//                       ? styles.tabCompletionDotDone
//                       : styles.tabCompletionDotPending,
//                   ]}
//                 />
//                 <Text
//                   style={[
//                     styles.tabButtonText,
//                     isActive && styles.tabButtonTextActive,
//                   ]}
//                 >
//                   {tab.label}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}
//         </ScrollView>
//       </View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="light-content" backgroundColor="#030508" />

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
//       {renderStateTabs()}

//       {loadingDocs ? (
//         <ActivityIndicator
//           size="large"
//           color={THEME.teal}
//           style={{ marginTop: 60 }}
//         />
//       ) : (
//         <>
//           <FlatList
//             data={displayedDocuments}
//             keyExtractor={(item) => item.id.toString()}
//             renderItem={renderItem}
//             contentContainerStyle={styles.listContent}
//             ListHeaderComponent={
//               showIncompleteTopBanner && !isProfileComplete ? (
//                 <View style={styles.incompleteTopBanner}>
//                   <AlertCircle
//                     size={18}
//                     color="#ff6b6b"
//                     style={{ marginRight: 10, marginTop: 2 }}
//                   />
//                   <View style={{ flex: 1 }}>
//                     <Text style={styles.incompleteTopBannerTitle}>
//                       Please complete all required documents
//                     </Text>
//                     <Text style={styles.incompleteTopBannerText}>
//                       Upload the missing documents below before proceeding to
//                       Rates.
//                     </Text>
//                   </View>
//                   <TouchableOpacity
//                     onPress={() => setShowIncompleteTopBanner(false)}
//                     hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//                   >
//                     <X size={18} color="#ff6b6b" />
//                   </TouchableOpacity>
//                 </View>
//               ) : null
//             }
//             ListEmptyComponent={
//               <Text style={styles.emptyText}>No documents found</Text>
//             }
//           />

//           {isContractor && uploadedDocuments.length > 0 && (
//             <View style={styles.bottomActionWrap}>
//               <TouchableOpacity
//                 style={styles.proceedRatesButton}
//                 onPress={handleProceedRates}
//                 activeOpacity={0.85}
//               >
//                 <Text style={styles.proceedRatesButtonText}>NEXT</Text>
//                 <ChevronRight size={18} color="#ffffff" />
//               </TouchableOpacity>
//             </View>
//           )}
//         </>
//       )}

//       <Modal
//         animationType="fade"
//         transparent
//         visible={incompleteModalVisible}
//         onRequestClose={() => setIncompleteModalVisible(false)}
//       >
//         <View style={styles.incompleteModalOverlay}>
//           <View style={styles.incompleteModalCard}>
//             <View style={styles.incompleteModalHeader}>
//               <AlertCircle size={22} color="#F5A623" />
//               <Text style={styles.incompleteModalTitle}>
//                 Incomplete information
//               </Text>
//               <TouchableOpacity
//                 onPress={() => setIncompleteModalVisible(false)}
//                 hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
//               >
//                 <X size={22} color="#fff" />
//               </TouchableOpacity>
//             </View>

//             <Text style={styles.incompleteModalSubtitle}>
//               The following information is incomplete. Please complete the
//               required documents before proceeding.
//             </Text>

//             <ScrollView
//               style={styles.incompleteModalScroll}
//               showsVerticalScrollIndicator={false}
//             >
//               {missingDocumentsByState.map((group) => (
//                 <View key={group.stateLabel} style={styles.incompleteGroup}>
//                   <Text style={styles.incompleteGroupTitle}>
//                     {group.stateLabel}
//                   </Text>
//                   {group.items.map((name, idx) => (
//                     <View
//                       key={`${group.stateLabel}-${name}-${idx}`}
//                       style={styles.incompleteItemRow}
//                     >
//                       <View style={styles.incompleteItemDot} />
//                       <Text style={styles.incompleteItemText}>
//                         {name === "No documents assigned for this state yet"
//                           ? name
//                           : getDisplayName(name)}
//                       </Text>
//                     </View>
//                   ))}
//                 </View>
//               ))}
//             </ScrollView>

//             {/* <TouchableOpacity
//               style={styles.incompleteModalBtn}
//               onPress={() => setIncompleteModalVisible(false)}
//               activeOpacity={0.85}
//             >
//               <Text style={styles.incompleteModalBtnText}>
//                 OK — I will complete these
//               </Text>
//             </TouchableOpacity> */}
//           </View>
//         </View>
//       </Modal>

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

//               {isVisaSelected ? (
//                 <>
//                   {/* ── Passport Number for Verification ── */}
//                   <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
//                     PASSPORT NUMBER FOR VERIFICATION *
//                   </Text>
//                   <View style={{ flexDirection: "row" }}>
//                     <TextInput
//                       style={[
//                         styles.inputBox,
//                         {
//                           flex: 1,
//                           borderTopRightRadius: 0,
//                           borderBottomRightRadius: 0,
//                         },
//                       ]}
//                       placeholder="Enter passport number"
//                       placeholderTextColor={THEME.textMuted}
//                       value={documentNumber}
//                       maxLength={DOC_NO_MAX}
//                       autoCapitalize="characters"
//                       onChangeText={(text) => {
//                         const formattedText = text.toUpperCase();
//                         setDocumentNumber(formattedText);
//                         setIsVerified(false);
//                         setExpirationDate(null);
//                         setExpiryError("");
//                         setShowWorkDocument(false);
//                         setWorkEntitlement(null);
//                         setWorkRightsError("");
//                       }}
//                     />

//                     <TouchableOpacity
//                       style={styles.verifyButton}
//                       disabled={verifying}
//                       onPress={handleVerifyDocument}
//                     >
//                       {verifying ? (
//                         <ActivityIndicator color={THEME.teal} />
//                       ) : (
//                         <Text style={styles.verifyButtonText}>Verify</Text>
//                       )}
//                     </TouchableOpacity>
//                   </View>
//                   {docNumberError ? (
//                     <Text style={styles.errorText}>{docNumberError}</Text>
//                   ) : null}
//                   {!isBridgingVisaDocument() && (
//                     <Text style={styles.inputHelpText}>
//                       Tap "Verify" to validate this passport and auto-fill the
//                       visa expiry date.
//                     </Text>
//                   )}

//                   {/* ── Visa Grant Number ── */}
//                   <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
//                     VISA GRANT NUMBER *
//                   </Text>
//                   <TextInput
//                     style={styles.inputBox}
//                     placeholder="Enter visa grant number"
//                     placeholderTextColor={THEME.textMuted}
//                     value={visaGrantNumber}
//                     maxLength={DOC_NO_MAX}
//                     autoCapitalize="characters"
//                     onChangeText={(text) => {
//                       setVisaGrantNumber(text.toUpperCase());
//                       setVisaGrantNumberError("");
//                     }}
//                   />
//                   {visaGrantNumberError ? (
//                     <Text style={styles.errorText}>{visaGrantNumberError}</Text>
//                   ) : null}
//                 </>
//               ) : (
//                 <>
//                   <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
//                     DOCUMENT NUMBER *
//                   </Text>
//                   {needsVerification ? (
//                     <View style={{ flexDirection: "row" }}>
//                       <TextInput
//                         style={[
//                           styles.inputBox,
//                           {
//                             flex: 1,
//                             borderTopRightRadius: 0,
//                             borderBottomRightRadius: 0,
//                           },
//                         ]}
//                         placeholder="Enter document number"
//                         placeholderTextColor={THEME.textMuted}
//                         value={documentNumber}
//                         maxLength={DOC_NO_MAX}
//                         autoCapitalize="characters"
//                         onChangeText={(text) => {
//                           const formattedText = text.toUpperCase();
//                           setDocumentNumber(formattedText);
//                           setIsVerified(false);
//                           setExpirationDate(null);
//                           setExpiryError("");
//                         }}
//                       />

//                       <TouchableOpacity
//                         style={styles.verifyButton}
//                         disabled={verifying}
//                         onPress={handleVerifyDocument}
//                       >
//                         {verifying ? (
//                           <ActivityIndicator color={THEME.teal} />
//                         ) : (
//                           <Text style={styles.verifyButtonText}>Verify</Text>
//                         )}
//                       </TouchableOpacity>
//                     </View>
//                   ) : (
//                     <TextInput
//                       style={styles.inputBox}
//                       placeholder="Enter document number"
//                       placeholderTextColor={THEME.textMuted}
//                       value={documentNumber}
//                       maxLength={DOC_NO_MAX}
//                       autoCapitalize="characters"
//                       onChangeText={(text) =>
//                         setDocumentNumber(text.toUpperCase())
//                       }
//                     />
//                   )}
//                   {docNumberError ? (
//                     <Text style={styles.errorText}>{docNumberError}</Text>
//                   ) : null}
//                   {needsVerification && (
//                     <Text style={styles.inputHelpText}>
//                       Tap "Verify" to validate this document and auto-fill its
//                       expiry date.
//                     </Text>
//                   )}
//                 </>
//               )}

//               {/* Expiration Date — hidden entirely for bridging-visa staff
//                   on the Visa document, or when the visa check returned
//                   show_document: true */}
//               {!hideExpiryDate && (
//                 <>
//                   <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
//                     EXPIRATION DATE *
//                   </Text>

//                   <TouchableOpacity
//                     style={[
//                       styles.dateButton,
//                       isExpiryLocked && styles.dateButtonDisabled,
//                     ]}
//                     activeOpacity={isExpiryLocked ? 1 : 0.8}
//                     disabled={isExpiryLocked}
//                     onPress={() => {
//                       if (!isExpiryLocked) {
//                         setShowExpiryPicker(true);
//                       }
//                     }}
//                   >
//                     <Text
//                       style={[
//                         styles.dateText,
//                         { color: expirationDate ? "#fff" : THEME.textMuted },
//                       ]}
//                     >
//                       {expirationDate
//                         ? formatAUDate(expirationDate)
//                         : needsVerification
//                         ? "Verify document to auto-fill expiry date"
//                         : "Tap to select expiry date"}
//                     </Text>

//                     {isExpiryLocked ? (
//                       <Lock size={16} color={THEME.textMuted} />
//                     ) : (
//                       <CalendarDays size={16} color={THEME.teal} />
//                     )}
//                   </TouchableOpacity>

//                   {/* Help Messages */}
//                   {isExpiryLocked && (
//                     <Text style={styles.inputHelpText}>
//                       Auto-filled from verification — cannot be edited manually.
//                     </Text>
//                   )}

//                   {expiryError ? (
//                     <Text style={styles.errorText}>{expiryError}</Text>
//                   ) : null}

//                   {/* Date Picker - Only show for non-locked documents */}
//                   {showExpiryPicker && !isExpiryLocked && (
//                     <DateTimePicker
//                       value={expirationDate || new Date()}
//                       mode="date"
//                       textColor="#FFFFFF"
//                       display={Platform.OS === "ios" ? "spinner" : "default"}
//                       onChange={handleExpiryDateChange}
//                     />
//                   )}
//                   {Platform.OS === "ios" &&
//                     showExpiryPicker &&
//                     !isExpiryLocked && (
//                       <TouchableOpacity
//                         style={styles.iosPickerDoneButton}
//                         onPress={() => setShowExpiryPicker(false)}
//                       >
//                         <Text style={styles.iosPickerDoneText}>Done</Text>
//                       </TouchableOpacity>
//                     )}
//                 </>
//               )}

//               {workEntitlement && (
//                 <View style={styles.workEntitlementBanner}>
//                   <Text style={styles.workEntitlementLabel}>
//                     Work Entitlement
//                   </Text>
//                   <Text style={styles.workEntitlementValue}>
//                     {workEntitlement}
//                   </Text>
//                 </View>
//               )}

//               {showWorkDocument && (
//                 <View style={styles.workRightsSection}>
//                   <View style={styles.sectionHeader}>
//                     <FileText
//                       size={18}
//                       color={THEME.teal}
//                       style={{ marginRight: 6 }}
//                     />
//                     <Text style={styles.sectionTitle}>
//                       Work Rights Document
//                     </Text>
//                   </View>
//                   {renderWorkRightsPreview()}
//                   <TouchableOpacity
//                     style={[
//                       styles.uploadBtn,
//                       uploadingWorkRights && styles.disabledBtn,
//                     ]}
//                     onPress={handleWorkRightsUpload}
//                     disabled={uploadingWorkRights}
//                     activeOpacity={0.8}
//                   >
//                     <CloudUpload
//                       size={18}
//                       color="#fff"
//                       style={{ marginRight: 8 }}
//                     />
//                     <Text style={styles.uploadBtnText}>
//                       {uploadingWorkRights
//                         ? "UPLOADING..."
//                         : "UPLOAD WORK RIGHTS DOCUMENT"}
//                     </Text>
//                   </TouchableOpacity>
//                   {!!workRightsError && (
//                     <Text style={styles.errorText}>{workRightsError}</Text>
//                   )}
//                 </View>
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
//                 <Text style={styles.saveButtonText}>
//                   {isEditing ? "UPDATE DOCUMENT" : "SAVE DOCUMENT"}
//                 </Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>

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

//   // ── State Tabs ──
//   tabBarWrapper: {
//     borderBottomWidth: 1,
//     borderBottomColor: THEME.border,
//     backgroundColor: THEME.background,
//   },
//   tabBarContent: {
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     gap: 8,
//   },
//   tabButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: "center",
//     backgroundColor: "rgba(255,255,255,0.05)",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     marginRight: 8,
//   },
//   tabButtonActive: {
//     backgroundColor: "#0A7C6E",
//     borderColor: "#0A7C6E",
//   },
//   tabButtonText: {
//     color: THEME.textMuted,
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   tabButtonTextActive: {
//     color: "#ffffff",
//     fontWeight: "700",
//   },
//   tabCompletionDot: {
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     marginRight: 6,
//   },
//   tabCompletionDotDone: {
//     backgroundColor: "#34C88A",
//   },
//   tabCompletionDotPending: {
//     backgroundColor: "#F5A623",
//   },

//   listContent: { padding: 16, paddingBottom: 40 },
//   emptyText: {
//     textAlign: "center",
//     marginTop: 60,
//     color: THEME.textMuted,
//     fontSize: 15,
//   },

//   // ── Bottom action (contractor "Proceed to My Rates") ──
//   bottomActionWrap: {
//     paddingHorizontal: 16,
//     paddingTop: 8,
//     paddingBottom: 16,
//     backgroundColor: THEME.background,
//     borderTopWidth: 1,
//     borderTopColor: THEME.border,
//   },
//   proceedHintText: {
//     color: "#d1cdcd",
//     fontSize: 11,
//     textAlign: "center",
//     marginBottom: 8,
//     lineHeight: 16,
//   },
//   proceedRatesButton: {
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#0A7C6E",
//     height: 52,
//     borderRadius: 10,
//     gap: 6,
//     borderWidth: 1,
//     borderColor: "rgba(137,231,208,0.2)",
//   },
//   proceedRatesButtonText: {
//     color: "#ffffff",
//     fontSize: 14,
//     fontWeight: "900",
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
//   workEntitlementBanner: {
//     marginTop: 16,
//     padding: 14,
//     borderRadius: 10,
//     backgroundColor: "rgba(0, 200, 180, 0.12)",
//     borderWidth: 1,
//     borderColor: "rgba(0, 200, 180, 0.35)",
//   },
//   workEntitlementLabel: {
//     fontSize: 11,
//     color: THEME.textMuted,
//     letterSpacing: 0.6,
//     marginBottom: 4,
//     textTransform: "uppercase",
//   },
//   workEntitlementValue: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: THEME.teal,
//   },
//   divider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },

//   viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
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
//   // Red border for missing / empty document cards
//   addCardButtonMissing: {
//     backgroundColor: "rgba(255,107,107,0.08)",
//     borderColor: "#ff6b6b",
//   },
//   addCardButtonText: { color: THEME.teal, fontSize: 12, fontWeight: "bold" },

//   // Top banner shown after tapping Next while docs are incomplete
//   incompleteTopBanner: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     backgroundColor: "rgba(255,107,107,0.12)",
//     borderWidth: 1,
//     borderColor: "rgba(255,107,107,0.45)",
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 16,
//   },
//   incompleteTopBannerTitle: {
//     color: "#ff6b6b",
//     fontSize: 14,
//     fontWeight: "800",
//     marginBottom: 4,
//   },
//   incompleteTopBannerText: {
//     color: "rgba(255,255,255,0.75)",
//     fontSize: 13,
//     lineHeight: 19,
//   },

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
//   modalBody: { padding: 16, backgroundColor: "#111111" },

//   imageUploadArea: { alignItems: "center", marginBottom: 20 },

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
//   workRightsSection: {
//     marginTop: 16,
//     padding: 14,
//     backgroundColor: "rgba(255, 255, 255, 0.03)",
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: THEME.border,
//   },
//   sectionHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   sectionTitle: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: THEME.textMain,
//   },

//   // ─── Preview Containers ────────────────────────────
//   imagePlaceholder: {
//     width: "100%",
//     height: 160,
//     // backgroundColor: THEME.cardBg,
//     borderRadius: 8,
//     overflow: "hidden",
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     marginBottom: 12,
//   },
//   previewImage: {
//     width: "100%",
//     height: "100%",
//     resizeMode: "cover",
//   },
//   errorPreviewContainer: {
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 16,
//   },
//   previewText: {
//     fontSize: 13,
//     color: THEME.textMuted,
//     marginTop: 8,
//     textAlign: "center",
//   },

//   // Document File Card Preview
//   docPreviewCard: {
//     width: "100%",
//     padding: 16,
//     backgroundColor: THEME.cardBg,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: THEME.border,
//     marginBottom: 12,
//   },
//   docPreviewIconWrap: {
//     marginBottom: 8,
//   },
//   docPreviewLabel: {
//     fontSize: 13,
//     color: THEME.textMain,
//     textAlign: "center",
//     marginBottom: 10,
//   },
//   viewDocButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: THEME.tealDark,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//   },
//   viewDocButtonText: {
//     color: "#ffffff",
//     fontSize: 12,
//     fontWeight: "600",
//   },

//   // ─── Upload Button ────────────────────────────────
//   uploadBtn: {
//     flexDirection: "row",
//     backgroundColor: "#0A7C6E",
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   uploadBtnText: {
//     color: "#fff",
//     fontSize: 11,
//     fontWeight: "700",
//     // letterSpacing: 0.5,
//   },

//   // Disabled State
//   disabledBtn: {
//     opacity: 0.6,
//   },
//   // Outer gradient boundary (No padding here)
//   cardGradientWrapper: {
//     borderRadius: 12,
//     marginBottom: 16,
//     marginHorizontal: 4,
//     overflow: "hidden",
//   },

//   // Inner container handling correct iOS padding
//   cardInnerContainer: {
//     padding: 16,
//     width: "100%",
//   },

//   infoRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 6,
//   },
//   infoLabel: {
//     color: THEME.textMuted,
//     fontSize: 13,
//     flex: 1,
//   },
//   infoValue: {
//     color: "#fff",
//     fontSize: 13,
//     fontWeight: "500",
//     textAlign: "right",
//     flex: 1,
//   },

//   cardActionsRow: {
//     flexDirection: "row",
//     gap: 10,
//     marginTop: 12,
//     width: "100%",
//   },
//   viewBtn: {
//     backgroundColor: THEME.accent,
//     height: 40,
//     borderRadius: 8,
//     flex: 1,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   editBtn: {
//     height: 40,
//     borderRadius: 8,
//     flex: 1,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "rgba(137,231,208,0.08)",
//     borderWidth: 1,
//     borderColor: "rgba(137,231,208,0.25)",
//   },

//   emptyCardTitleRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },

//   incompleteBanner: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     backgroundColor: "rgba(245,166,35,0.1)",
//     borderWidth: 1,
//     borderColor: "rgba(245,166,35,0.4)",
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 16,
//   },
//   incompleteBannerTitle: {
//     color: "#F5A623",
//     fontSize: 14,
//     fontWeight: "800",
//     marginBottom: 4,
//   },
//   incompleteBannerText: {
//     color: "rgba(255,255,255,0.75)",
//     fontSize: 13,
//     lineHeight: 19,
//   },
//   incompleteModalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.75)",
//     justifyContent: "center",
//     paddingHorizontal: 24,
//   },
//   incompleteModalCard: {
//     backgroundColor: THEME.cardBg,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: "rgba(245,166,35,0.35)",
//     maxHeight: "78%",
//     overflow: "hidden",
//   },
//   incompleteModalHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     paddingBottom: 8,
//     gap: 10,
//   },
//   incompleteModalTitle: {
//     flex: 1,
//     color: "#fff",
//     fontSize: 17,
//     fontWeight: "800",
//   },
//   incompleteModalSubtitle: {
//     color: "rgba(255,255,255,0.7)",
//     fontSize: 13,
//     lineHeight: 19,
//     paddingHorizontal: 16,
//     marginBottom: 12,
//   },
//   incompleteModalScroll: {
//     paddingHorizontal: 16,
//     maxHeight: 320,
//   },
//   incompleteGroup: {
//     marginBottom: 14,
//     backgroundColor: "rgba(255,255,255,0.03)",
//     borderRadius: 10,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: THEME.border,
//   },
//   incompleteGroupTitle: {
//     color: THEME.teal,
//     fontSize: 13,
//     fontWeight: "800",
//     marginBottom: 8,
//   },
//   incompleteItemRow: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     marginBottom: 6,
//   },
//   incompleteItemDot: {
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     backgroundColor: "#F5A623",
//     marginTop: 6,
//     marginRight: 10,
//   },
//   incompleteItemText: {
//     flex: 1,
//     color: "#fff",
//     fontSize: 14,
//     lineHeight: 20,
//   },
//   incompleteModalBtn: {
//     margin: 16,
//     height: 48,
//     borderRadius: 10,
//     backgroundColor: "rgba(245,166,35,0.2)",
//     borderWidth: 1,
//     borderColor: "rgba(245,166,35,0.5)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   incompleteModalBtnText: {
//     color: "#F5A623",
//     fontSize: 14,
//     fontWeight: "800",
//   },

//   emptyCardHighlight: {
//     borderStyle: "dashed",
//     borderWidth: 1.5,
//     borderColor: "#F5A623",
//   },

//   emptyDocIconBox: {
//     backgroundColor: "rgba(255,255,255,0.06)",
//   },

//   requiredBadge: {
//     backgroundColor: "rgba(255,255,255,0.06)",
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//     borderRadius: 4,
//     borderWidth: 1,
//     borderColor: THEME.border,
//   },

//   requiredBadgeText: {
//     color: "#fff",
//     fontSize: 10,
//     fontWeight: "800",
//     letterSpacing: 0.4,
//   },

//   emptyCardHint: {
//     color: THEME.textMuted,
//     fontSize: 12,
//     marginTop: 4,
//     fontWeight: "500",
//   },

//   addCardButtonHighlight: {
//     height: 42,
//     backgroundColor: "rgba(255,255,255,0.05)",
//     borderRadius: 8,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 14,
//     borderWidth: 1,
//     borderColor: THEME.border,
//   },

//   addCardButtonTextHighlight: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "800",
//   },
// });

import React, { useState, useEffect, useMemo } from "react";
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
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  IdCard,
  CheckCircle2,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL, getUserProfile, uploadFile } from "../services/authApi";
import { launchImageLibrary } from "react-native-image-picker";
import LinearGradient from "react-native-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

// const FILE_BASE_URL = "https://apis.staffoo.com.au/staff_documents/";
const FILE_BASE_URL = "https://apis-staging.staffoo.com.au/staff_documents/";
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
  working_rights?: string | null;
};

const THEME = {
  background: "#030508",

  accent: "#366bf0",
  teal: "#89E7D0",
  textLight: "#FFFFFF",
  textMuted: "#6C7A89",
  border: "rgba(255, 255, 255, 0.1)",

  tealDark: "#0077b6",
  bgDark: "#141929",
  cardBg: "#1e2538",

  textMain: "#ffffff",

  error: "#ff6b6b",
  success: "#2ec4b6",
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

const VERIFIABLE_DOCUMENT_NAMES = ["visa", "security license"];
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

// ─── Staff document completion (100-point ID check) ──────────────────────────
// Mirrors the backend $documentPoints map. Only used for user_type === "staff".
// A document only contributes its points once it actually has an uploaded file.
const STAFF_DOCUMENT_POINTS: Record<string, number> = {
  passport: 70,
  citizen_ship: 70,
  medicare: 25,
  birth_certificate: 25,
  security_license: 40,
  driver_license_front: 70,
  driver_license_back: 0,
  working_with_children: 0,
  first_aid: 0,
  cpr: 0,
  visa: 0,
};

// Points contributed by a single staff document (0 if it isn't part of the
// 100-point map, or has no key match for its document_type).
const getStaffDocPoints = (doc: Document): number => {
  const key = (doc.document_type || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
  return STAFF_DOCUMENT_POINTS[key] ?? 0;
};

type StateTab = { code: string; label: string; category: string };

const STATE_TAB_CONFIG: StateTab[] = [
  { code: "vic", label: "Victoria", category: "contractor_document" },
  { code: "nsw", label: "New South Wales", category: "nsw_document" },
  { code: "qld", label: "Queensland", category: "qld_document" },
  { code: "tas", label: "Tasmania", category: "tas_document" },
  { code: "wa", label: "Western Australia", category: "wa_document" },
  { code: "sa", label: "South Australia", category: "sa_document" },
];

const parseStatesAllowed = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).toLowerCase().trim());
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).toLowerCase().trim());
      }
    } catch {
      return raw
        .split(",")
        .map((s) =>
          s
            .replace(/[\[\]"]/g, "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
    }
  }
  return [];
};

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

const parseApiExpiryDate = (value: string): Date | null => {
  if (!value) return null;
  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const ddmmyyyyDash = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDash) {
    const [, dd, mm, yyyy] = ddmmyyyyDash;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

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
        </View>
      )}
    </View>
  );
};

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

export default function DocumentsScreen({ navigation }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [fileError, setFileError] = useState("");
  const [docNumberError, setDocNumberError] = useState("");
  const [expiryError, setExpiryError] = useState("");
  const [incompleteModalVisible, setIncompleteModalVisible] = useState(false);
  // Shown at the top of the list when user taps Next while docs are incomplete
  const [showIncompleteTopBanner, setShowIncompleteTopBanner] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<{
    label: string;
    value: string;
    category: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [visaGrantNumber, setVisaGrantNumber] = useState("");
  const [visaGrantNumberError, setVisaGrantNumberError] = useState("");
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
  const [selectedStateCategory, setSelectedStateCategory] = useState<
    string | null
  >(null);

  const [showWorkDocument, setShowWorkDocument] = useState(false);
  const [workEntitlement, setWorkEntitlement] = useState<string | null>(null);
  const [workRightsFile, setWorkRightsFile] = useState<any>(null);
  const [workRightsFilePath, setWorkRightsFilePath] = useState<string | null>(
    null,
  );
  const [uploadingWorkRights, setUploadingWorkRights] = useState(false);
  const [workRightsError, setWorkRightsError] = useState("");

  const SHARED_DOC_MATCHERS = [
    (key: string) => key.includes("public liability"),
    (key: string) =>
      key.includes("security") &&
      (key.includes("membership") || key.includes("member")),
    (key: string) => key.includes("asic"),
  ];

  const normalizeDocKey = (name?: string) =>
    (name || "").toLowerCase().trim().replace(/\s+/g, " ");

  const isSharedDocumentType = (name?: string): boolean => {
    const key = normalizeDocKey(name);
    return SHARED_DOC_MATCHERS.some((fn) => fn(key));
  };

  /** Same shared type, any category, with a real file */
  const findSharedUploadedDoc = (
    docs: Document[],
    docName?: string,
    excludeCategory?: string | null,
  ): Document | undefined => {
    if (!isSharedDocumentType(docName)) return undefined;
    const key = normalizeDocKey(docName);

    return docs.find((other) => {
      if (excludeCategory && other.document_category === excludeCategory) {
        return false;
      }
      if (!other.file || !String(other.file).trim()) return false;
      const otherKey = normalizeDocKey(other.document_name);
      if (otherKey === key) return true;
      return SHARED_DOC_MATCHERS.some((fn) => fn(key) && fn(otherKey));
    });
  };

  /** Fill empty state docs from an already-uploaded shared copy */
  const withInheritedSharedFiles = (
    stateDocs: Document[],
    allDocs: Document[],
    stateCategory: string | null,
  ): Document[] =>
    stateDocs.map((doc) => {
      if (doc.file && String(doc.file).trim()) return doc;

      const shared = findSharedUploadedDoc(
        allDocs,
        doc.document_name,
        stateCategory,
      );
      if (!shared) return doc;

      return {
        ...doc,
        file: shared.file,
        document_no: doc.document_no || shared.document_no,
        document_expiry: doc.document_expiry || shared.document_expiry,
        working_rights: doc.working_rights || shared.working_rights,
        _inheritedFrom: shared.document_category,
      } as Document & { _inheritedFrom?: string };
    });

  const isVisaDocType = (opts: {
    label?: string | null;
    value?: string | null;
  }): boolean => {
    const name = (opts.label || opts.value || "").toLowerCase().trim();
    return name === "visa" || name.includes("visa");
  };

  /** "Security Master License" — verification is only enabled for contractors */
  const isSecurityMasterLicenseDocType = (opts: {
    label?: string | null;
    value?: string | null;
  }): boolean => {
    const name = (opts.label || opts.value || "").toLowerCase().trim();
    return (
      name === "security master license" ||
      name.includes("security master license")
    );
  };

  const isContractor =
    (userProfile?.user_type || "").toLowerCase().trim() === "contractor";

  // Staff-only flag — never affects contractor/customer flows below.
  const isStaff =
    (userProfile?.user_type || "").toLowerCase().trim() === "staff";

  /**
   * A document type requires the "Verify" flow when:
   *  - it's in the always-verifiable list (visa, security license), OR
   *  - it's "Security Master License" AND the current user is a contractor
   */
  const docTypeNeedsVerification = (
    docType: { label?: string | null; value?: string | null } | null,
  ): boolean => {
    if (!docType) return false;
    if (isVerifiableDocType(docType)) return true;
    if (isContractor && isSecurityMasterLicenseDocType(docType)) return true;
    return false;
  };

  const needsVerification = selectedDocType
    ? docTypeNeedsVerification(selectedDocType)
    : false;

  const isVisaSelected = selectedDocType
    ? isVisaDocType(selectedDocType)
    : false;

  const isExpiryLocked = needsVerification;

  const contractorStateTabs = useMemo((): StateTab[] => {
    if (!isContractor) return [];
    const allowedCodes = parseStatesAllowed(userProfile?.states_allowed);
    if (allowedCodes.length === 0) return [];
    return STATE_TAB_CONFIG.filter((tab) => allowedCodes.includes(tab.code));
  }, [isContractor, userProfile?.states_allowed]);

  useEffect(() => {
    if (!isContractor) {
      setSelectedStateCategory(null);
      return;
    }
    if (contractorStateTabs.length === 0) {
      setSelectedStateCategory(null);
      return;
    }
    const stillValid = contractorStateTabs.some(
      (t) => t.category === selectedStateCategory,
    );
    if (!stillValid) {
      setSelectedStateCategory(contractorStateTabs[0].category);
    }
  }, [isContractor, contractorStateTabs]);

  const displayedDocuments = useMemo(() => {
    if (!isContractor) return uploadedDocuments;
    if (!selectedStateCategory) return uploadedDocuments;

    return uploadedDocuments.filter(
      (d) => d.document_category === selectedStateCategory,
    );
  }, [isContractor, uploadedDocuments, selectedStateCategory]);

  const allRequiredStateDocuments = useMemo(() => {
    if (!isContractor) return uploadedDocuments;

    const allowedCategories = contractorStateTabs.map((t) => t.category);
    if (allowedCategories.length === 0) return uploadedDocuments;

    return uploadedDocuments.filter((d) =>
      allowedCategories.includes(d.document_category || ""),
    );
  }, [isContractor, uploadedDocuments, contractorStateTabs]);

  const profileCompletion = Number(
    userProfile?.profile_completion_percentage ?? 0,
  );

  const haveAllRequiredDocs =
    Array.isArray(allRequiredStateDocuments) &&
    allRequiredStateDocuments.length > 0 &&
    allRequiredStateDocuments.every(
      (d) => !!(d.file && String(d.file).trim().length > 0),
    );

  const everyAllowedStateHasDocs = useMemo(() => {
    if (!isContractor) return true;
    if (contractorStateTabs.length === 0) return true;

    return contractorStateTabs.every((tab) => {
      const tabDocs = uploadedDocuments.filter(
        (d) => d.document_category === tab.category,
      );
      if (tabDocs.length === 0) return false;

      return tabDocs.every((d) => {
        if (d.file && String(d.file).trim().length > 0) return true;
        return !!findSharedUploadedDoc(
          uploadedDocuments,
          d.document_name,
          tab.category,
        );
      });
    });
  }, [isContractor, contractorStateTabs, uploadedDocuments]);

  const isProfileComplete = haveAllRequiredDocs && everyAllowedStateHasDocs;

  /** Specific missing documents, grouped by state (raw names; display later) */
  const missingDocumentsByState = useMemo(() => {
    type MissingGroup = { stateLabel: string; items: string[] };
    const groups: MissingGroup[] = [];

    // Missing only if this document's own file is empty/null
    const isDocMissing = (d: Document) =>
      !(d.file && String(d.file).trim().length > 0);

    if (isContractor && contractorStateTabs.length > 0) {
      contractorStateTabs.forEach((tab) => {
        const tabDocs = uploadedDocuments.filter(
          (d) => d.document_category === tab.category,
        );
        const missing = tabDocs
          .filter((d) => isDocMissing(d))
          .map((d) => d.document_name || "Unknown document");

        if (tabDocs.length === 0) {
          groups.push({
            stateLabel: tab.label,
            items: ["No documents assigned for this state yet"],
          });
        } else if (missing.length > 0) {
          groups.push({ stateLabel: tab.label, items: missing });
        }
      });
    } else {
      const missing = uploadedDocuments
        .filter((d) => isDocMissing(d))
        .map((d) => d.document_name || "Unknown document");
      if (missing.length > 0) {
        groups.push({ stateLabel: "Required documents", items: missing });
      }
    }

    return groups;
  }, [isContractor, contractorStateTabs, uploadedDocuments]);

  const totalMissingCount = missingDocumentsByState.reduce(
    (sum, g) => sum + g.items.length,
    0,
  );

  const handleProceedRates = () => {
    if (!isProfileComplete) {
      // Show top banner asking user to complete required documents
      setShowIncompleteTopBanner(true);
      return;
    }
    setShowIncompleteTopBanner(false);
    navigation.navigate("ContractorRates");
  };

  // ─── Staff-only: personal info gate + document completion (100 points) ─────

  // Mirrors ProfileSetupScreen's "isStaffooStaff" flag: profile.user_id === 1
  // determines whether DOB / Country of Birth / Visa Status are required.
  const isStaffooStaffUser = userProfile?.user_id === 1;

  const isStaffPersonalInfoComplete = useMemo(() => {
    if (!isStaff) return true; // Never gates contractor/customer
    if (!userProfile) return false;

    const name = userProfile?.name;
    const phone = userProfile?.phone || userProfile?.staff?.phone;
    const email = userProfile?.email;
    const address = userProfile?.address || userProfile?.staff?.address;
    const gender = userProfile?.staff?.gender || userProfile?.gender;
    const securityLicenseNo =
      userProfile?.staff?.security_license_no ||
      userProfile?.security_license_no;

    if (!name || !String(name).trim()) return false;
    if (!phone || !String(phone).trim()) return false;
    if (!email || !String(email).trim()) return false;
    if (!address || !String(address).trim()) return false;
    if (!gender) return false;
    if (!securityLicenseNo || !String(securityLicenseNo).trim()) return false;

    if (isStaffooStaffUser) {
      const dob = userProfile?.staff?.date_of_birth;
      const originCountry = userProfile?.staff?.origin_country;
      const visaStatus = userProfile?.staff?.staff_document_type;

      if (!dob || !String(dob).trim()) return false;
      if (!originCountry || !String(originCountry).trim()) return false;
      if (!visaStatus || !String(visaStatus).trim()) return false;
    }

    return true;
  }, [isStaff, userProfile, isStaffooStaffUser]);

  const isDocumentExpired = (expiry?: string | null): boolean => {
    if (!expiry || !String(expiry).trim()) return false;
    const d = new Date(expiry);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const expiredDocuments = useMemo(() => {
    return uploadedDocuments.filter(
      (d) =>
        !!(d.file && String(d.file).trim().length > 0) &&
        isDocumentExpired(d.document_expiry),
    );
  }, [uploadedDocuments]);

  const hasExpiredDocuments = expiredDocuments.length > 0;

  // Raw (uncapped) point total across all uploaded staff documents — this is
  // what the "165 / 100 Points" badge displays, so it can read above 100.
  const staffDocumentPointsRaw = useMemo(() => {
    if (!isStaff) return 0;
    let total = 0;
    uploadedDocuments.forEach((doc) => {
      const hasFile = !!(doc.file && String(doc.file).trim().length > 0);
      if (!hasFile) return;
      if (isDocumentExpired(doc.document_expiry)) return; // ← skip expired
      total += getStaffDocPoints(doc);
    });
    return total;
  }, [isStaff, uploadedDocuments]);

  // Same total, capped at 100 — used only to size the progress bar fill.
  const staffDocumentCompletionPercentage = useMemo(
    () => Math.min(staffDocumentPointsRaw, 100),
    [staffDocumentPointsRaw],
  );

  const isStaffDocumentsComplete = staffDocumentPointsRaw >= 100;

  const handleStaffProceedNext = () => {
    if (!isStaffDocumentsComplete) {
      Toast.show({
        type: "error",
        text1: "Please complete all required documents",
        text2: `Document completion: ${staffDocumentPointsRaw}/100 points`,
        position: "bottom",
      });
      return;
    }
    // All required document points reached -> unlock the verification
    // (Staff Form) step.
    navigation.navigate("StaffForms");
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hide top incomplete banner once all required docs are filled
  useEffect(() => {
    if (isProfileComplete) {
      setShowIncompleteTopBanner(false);
    }
  }, [isProfileComplete]);

  const isBridgingVisaStaff = (): boolean => {
    const staffDocType =
      userProfile?.staff?.staff_document_type ||
      userProfile?.staff_document_type ||
      "";
    return staffDocType.toLowerCase().trim() === "bridging_visa";
  };

  const isBridgingVisaDocument = (): boolean => {
    return !!(
      selectedDocType &&
      isVisaDocType(selectedDocType) &&
      isBridgingVisaStaff()
    );
  };

  const hideExpiryDate = showWorkDocument || isBridgingVisaDocument();

  const getPassportDocument = (): Document | undefined => {
    return userProfile?.documents?.find(
      (d: Document) => d.document_name?.toLowerCase().trim() === "passport",
    );
  };
  const toTitleCase = (text?: string) => {
    if (!text) return "";
    return text
      .toLowerCase()
      .replace(/_/g, " ") // convert underscores → spaces
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
    "security license": "Security Licence",
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
    "security master license": "Security Master License",
    "public liability": "Public Liability",
    workcover: "Workcover",
    "labour hire": "Labour Hire",
    "asic report": "ASIC Report",

    // ── newly added ──
    msic_card: "MSIC Card",
    "msic card": "MSIC Card",
    control_room_certificate: "Control Room Certificate",
    "control room certificate": "Control Room Certificate",
    ras_certificate: "RAS Certificate",
    "ras certificate": "RAS Certificate",
    rsa_certificate: "RSA Certificate",
    "rsa certificate": "RSA Certificate",
  };

  const DOCUMENT_ORDER: Record<string, number> = {
    passport: 1,
    visa: 2,
    "driver license front": 3,

    "driver license back": 4,

    "security license": 5,

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
    "security master license": 13,
    "public liability": 14,
    workcover: 15,
    "labour hire": 16,
    "asic report": 17,
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
    key = key.replace(/_/g, " "); // ras_certificate → ras certificate
    key = key.replace(/check \(wwcc\)/i, "working with children");
    key = key.replace(/\s+/g, " ");

    // 1) Exact match first (keeps "certificate" in the key)
    if (DOCUMENT_DISPLAY_NAME[key]) {
      return DOCUMENT_DISPLAY_NAME[key];
    }

    // 2) Match without a trailing " certificate"
    const withoutCert = key.replace(/\s*certificate\s*$/i, "").trim();
    if (DOCUMENT_DISPLAY_NAME[withoutCert]) {
      return DOCUMENT_DISPLAY_NAME[withoutCert];
    }
    if (DOCUMENT_DISPLAY_NAME[`${withoutCert} certificate`]) {
      return DOCUMENT_DISPLAY_NAME[`${withoutCert} certificate`];
    }

    // 3) Fallback
    return toTitleCase(docName);
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
    setVisaGrantNumber("");
    setVisaGrantNumberError("");
    setExpirationDate(null);
    setShowExpiryPicker(false);
    setFileError("");
    setDocNumberError("");
    setExpiryError("");
    setVerifying(false);
    setIsVerified(false);
    setIsEditing(false);

    // ── Add these lines to hide the work rights section on reset ──
    setShowWorkDocument(false);
    setWorkEntitlement(null);
    setWorkRightsFile(null);
    setWorkRightsFilePath(null);
    setUploadingWorkRights(false);
    setWorkRightsError("");
  };
  const handleOpenAddModal = (docType: {
    label: string;
    value: string;
    category: string;
  }) => {
    // Staff-only: block document add/edit until personal info is complete.
    if (isStaff && !isStaffPersonalInfoComplete) {
      Toast.show({
        type: "error",
        text1: "Complete your profile first",
        text2:
          "Please finish your personal information before uploading documents.",
        position: "bottom",
      });
      navigation.navigate("ProfileSetup");
      return;
    }

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
    setIsEditing(false);
    setSelectedDocType(docType);
    setIsVerified(false);
    setExpirationDate(null);

    if (isVisaDocType(docType)) {
      const passportDoc = getPassportDocument();
      if (passportDoc?.document_no) {
        setDocumentNumber(passportDoc.document_no.toUpperCase());
      }
    }

    setModalVisible(true);
  };
  const handleOpenEditModal = (item: Document) => {
    // Staff-only: block document add/edit until personal info is complete.
    if (isStaff && !isStaffPersonalInfoComplete) {
      Toast.show({
        type: "error",
        text1: "Complete your profile first",
        text2:
          "Please finish your personal information before uploading documents.",
        position: "bottom",
      });
      navigation.navigate("ProfileSetup");
      return;
    }

    resetForm();
    setIsEditing(true);

    const docType = {
      label: item.document_name,
      value: item.document_name,
      category: item.document_category || "",
    };

    setSelectedDocType(docType);

    if (isVisaDocType(docType)) {
      const passportDoc = getPassportDocument();
      setDocumentNumber(passportDoc?.document_no?.toUpperCase() || "");
      setVisaGrantNumber(item.document_no || "");
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
    if (isVisaDocType(docType) && item.working_rights) {
      setWorkRightsFilePath(item.working_rights);
    }

    if (docTypeNeedsVerification(docType)) {
      if (isVisaDocType(docType)) {
        const passportDoc = getPassportDocument();
        const hasPassportNumber = !!passportDoc?.document_no;
        const bridging = isBridgingVisaStaff();
        if (bridging) {
          setIsVerified(
            !!(
              hasPassportNumber &&
              (item.document_expiry || item.working_rights)
            ),
          );
        } else {
          setIsVerified(!!(hasPassportNumber && item.document_expiry));
        }
      } else {
        setIsVerified(!!(item.document_no && item.document_expiry));
      }
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

  const handleWorkRightsUpload = async () => {
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
        name: asset.fileName || `work_right_${Date.now()}`,
      };
      setWorkRightsFile(file);
      setWorkRightsError("");
      setUploadingWorkRights(true);
      const uploaded = await uploadFile(file);
      const filePath = uploaded?.url || uploaded?.path || uploaded?.file || "";
      setWorkRightsFilePath(filePath);
      Toast.show({
        type: "success",
        text1: "Work rights document uploaded successfully",
        position: "bottom",
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Work rights document upload failed",
        position: "bottom",
      });
    } finally {
      setUploadingWorkRights(false);
    }
  };

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
      setDocNumberError(
        isVisaSelected
          ? "Please enter passport number"
          : "Please enter document number",
      );
      Toast.show({
        type: "error",
        text1: isVisaSelected
          ? "Please enter passport number"
          : "Please enter document number",
        position: "bottom",
      });
      return;
    }

    const docNameLower = (selectedDocType.label || selectedDocType.value || "")
      .toLowerCase()
      .trim();

    const isVisa = docNameLower.includes("visa");
    const isSecurityLicense = docNameLower.includes("security");

    try {
      setVerifying(true);
      setExpiryError("");

      // Clear previous work rights file states when re-verifying
      setWorkRightsFile(null);
      setWorkRightsFilePath(null);
      setWorkRightsError("");

      const token = await AsyncStorage.getItem("@auth_token");
      let response;

      if (isVisa) {
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
            text1: "Country of Birth missing",
            text2: "Please add your Country of Birth in Profile first.",
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

        console.log("📤 VISA Payload:", JSON.stringify(payload, null, 2));

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
      } else if (isSecurityLicense) {
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

        const docLabel = (selectedDocType.label || selectedDocType.value || "")
          .toLowerCase()
          .trim();
        const isSecurityMasterLicense =
          docLabel === "security master license" ||
          docLabel.includes("security master license");

        const addressState =
          profile?.state ||
          profile?.staff?.state ||
          profile?.contractor?.state ||
          profile?.address_state ||
          "";

        const selectedTabState = contractorStateTabs.find(
          (t) => t.category === selectedStateCategory,
        )?.code;

        const userState =
          isSecurityMasterLicense && isContractor
            ? String(selectedTabState || addressState).trim()
            : (isContractor && selectedTabState) ||
              String(addressState).trim() ||
              "";

        if (!userState) {
          Toast.show({
            type: "error",
            text1: "State is required",
            text2: "Please add your State / Address in Profile first",
            position: "bottom",
          });
          setVerifying(false);
          navigation.navigate("ProfileSetup");
          return;
        }

        const payload = {
          document_type: selectedDocType.label,
          license_number: documentNumber.trim(),
          state: userState,
        };

        console.log(
          "📤 SECURITY LICENSE Payload:",
          JSON.stringify(payload, null, 2),
        );

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

      console.log(
        "✅ VERIFY RESPONSE:",
        JSON.stringify(response?.data, null, 2),
      );

      const data = response?.data;

      if (data?.success === false) {
        setIsVerified(false);
        setExpirationDate(null);
        setShowWorkDocument(false);
        setWorkEntitlement(null);
        Toast.show({
          type: "error",
          text1: data?.message || "Document verification failed",
          position: "bottom",
        });
        return;
      }

      if (isVisa) {
        const shouldShowWorkDoc =
          data?.show_document === true || data?.data?.show_document === true;

        setShowWorkDocument(!!shouldShowWorkDoc);

        const entitlement =
          data?.work_entitlement || data?.data?.work_entitlement || null;
        setWorkEntitlement(entitlement);

        const expiryRaw =
          data?.expiry ||
          data?.expiry_date ||
          data?.document_expiry ||
          data?.expired_at ||
          data?.data?.expiry ||
          data?.data?.expiry_date ||
          data?.data?.document_expiry ||
          data?.data?.expired_at;

        if (expiryRaw) {
          const dateObj = parseApiExpiryDate(expiryRaw);
          if (dateObj) {
            setExpirationDate(dateObj);
            setShowExpiryPicker(false);
            setExpiryError("");
          }
        } else if (!shouldShowWorkDoc) {
          setExpirationDate(null);
        }

        setIsVerified(true);

        Toast.show({
          type: "success",
          text1: data?.message || "Document verified successfully",
          position: "bottom",
        });
        return;
      }

      const expiryRaw =
        data?.expiry ||
        data?.expiry_date ||
        data?.document_expiry ||
        data?.expired_at ||
        data?.data?.expiry ||
        data?.data?.expiry_date ||
        data?.data?.document_expiry ||
        data?.data?.expired_at;

      if (expiryRaw) {
        const dateObj = parseApiExpiryDate(expiryRaw);
        if (dateObj) {
          setExpirationDate(dateObj);
          setShowExpiryPicker(false);
        }
      } else {
        setExpirationDate(null);
      }
      Toast.show({
        type: "success",
        text1: data?.message || "Document verified successfully",
        position: "bottom",
      });
      return;
    } catch (error: any) {
      console.log("=== VERIFY ERROR ===");
      console.log(JSON.stringify(error?.response?.data, null, 2));

      setIsVerified(false);
      setExpirationDate(null);
      setShowWorkDocument(false);
      setWorkEntitlement(null);

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

  const isSelectedStateComplete = useMemo(() => {
    if (!isContractor || !selectedStateCategory) return true;

    const tabDocs = uploadedDocuments.filter(
      (d) => d.document_category === selectedStateCategory,
    );

    if (tabDocs.length === 0) return false;

    return tabDocs.every((d) => {
      if (d.file && String(d.file).trim().length > 0) return true;
      // also count shared documents as complete
      return !!findSharedUploadedDoc(
        uploadedDocuments,
        d.document_name,
        selectedStateCategory,
      );
    });
  }, [isContractor, selectedStateCategory, uploadedDocuments]);

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
    setVisaGrantNumberError("");
    setExpiryError("");
    setWorkRightsError("");

    if (!selectedFile && !uploadedFilePath) {
      setFileError("Please upload a file");
      hasError = true;
    }

    if (isVisaSelected) {
      if (!documentNumber.trim()) {
        setDocNumberError("Please fill the passport number");
        hasError = true;
      }
      if (!visaGrantNumber.trim()) {
        setVisaGrantNumberError("Please fill the visa grant number");
        hasError = true;
      }
    } else if (!documentNumber.trim()) {
      setDocNumberError("Please fill the document number");
      hasError = true;
    }

    if (needsVerification) {
      // ONLY visa documents & Security License must be verified online first.
      // if (!isVerified) {
      //   Toast.show({
      //     type: "error",
      //     text1: "Please verify document first",
      //     position: "bottom",
      //   });
      //   return;
      // }

      if (hideExpiryDate) {
        if (!workRightsFile && !workRightsFilePath) {
          setWorkRightsError("Please upload work rights document");
          hasError = true;
        }
      } else if (!expirationDate) {
        Toast.show({
          type: "error",
          text1: "Please select an expiry date",
          position: "bottom",
        });
        return;
      }
    } else if (!expirationDate) {
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

      let expDate = "";
      if (expirationDate) {
        const year = expirationDate.getFullYear();
        const month = String(expirationDate.getMonth() + 1).padStart(2, "0");
        const day = String(expirationDate.getDate()).padStart(2, "0");
        expDate = `${year}-${month}-${day}`;
      }

      const savedDocumentNo = isVisaSelected
        ? visaGrantNumber.trim()
        : documentNumber.trim();

      const existingDoc = uploadedDocuments.find((d) => {
        const apiName =
          d.document_name?.toLowerCase().replace(/[\s_]+/g, "") || "";
        const apiType =
          d.document_type?.toLowerCase().replace(/[\s_]+/g, "") || "";
        const apiCategory = d.document_category || "";
        const matchValue = selectedDocType!.value
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        const nameOrTypeMatches =
          apiName === matchValue || apiType === matchValue;

        if (isContractor && selectedDocType!.category) {
          return nameOrTypeMatches && apiCategory === selectedDocType!.category;
        }
        return nameOrTypeMatches;
      });

      const payload: any = {
        user_id: userId,
        document_no: savedDocumentNo,
        document_expiry: expDate,
        file: fileName,
        document_category: selectedDocType!.category,
      };

      if (hideExpiryDate) {
        let workRightFileName = "";
        if (workRightsFilePath) {
          workRightFileName =
            workRightsFilePath.split("/").pop() || workRightsFilePath;
        } else if (workRightsFile?.name) {
          workRightFileName = workRightsFile.name;
        }
        payload.working_rights = workRightFileName;
      }

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

  const renderFilePreview = (
    fileUri: string | null,
    fileMime: string | null,
    fileName: string,
    emptyLabel: string,
  ) => {
    if (!fileUri) {
      return (
        <View style={styles.imagePlaceholder}>
          <View style={styles.errorPreviewContainer}>
            <CloudUpload size={48} color={THEME.textMuted} />
            <Text style={styles.previewText}>{emptyLabel}</Text>
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

  const renderModalPreview = () => {
    const fileUri =
      selectedFile?.uri ||
      (uploadedFilePath ? getFileUrl(uploadedFilePath) : null);
    const fileMime = selectedFile?.type || null;
    const fileName =
      selectedFile?.name || uploadedFilePath?.split("/").pop() || "Document";

    return renderFilePreview(
      fileUri,
      fileMime,
      fileName,
      "No file uploaded yet",
    );
  };

  const renderWorkRightsPreview = () => {
    const fileUri =
      workRightsFile?.uri ||
      (workRightsFilePath ? getFileUrl(workRightsFilePath) : null);
    const fileMime = workRightsFile?.type || null;
    const fileName =
      workRightsFile?.name ||
      workRightsFilePath?.split("/").pop() ||
      "Work Rights Document";

    return renderFilePreview(
      fileUri,
      fileMime,
      fileName,
      "No work rights document uploaded yet",
    );
  };

  const renderFilledCard = (item: Document) => {
    const status = getExpiryStatus(item.document_expiry);
    const fileUrl = getFileUrl(item.file);
    const isImg = isImageFile(item.file);
    const ext = item.file?.split(".").pop()?.toUpperCase() || "";
    // Staff-only: points this specific document contributes to the 100-pt check.
    const docPoints =
      isStaff && isStaffooStaffUser ? getStaffDocPoints(item) : 0;

    return (
      <LinearGradient
        colors={["#1e2538", "#141929"]}
        style={styles.cardGradientWrapper} // 1. Keep ONLY structural/radius bounds here
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* 2. Move padding and layout rules to this inner container */}
        <View style={styles.cardInnerContainer}>
          <View style={styles.cardTopRow}>
            <View style={styles.docIconBox}>
              <FileText size={22} color={THEME.teal} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.cardDocName} numberOfLines={1}>
                {getDisplayName(item.document_name)}
                {isStaff && isStaffooStaffUser ? ` (${docPoints} points)` : ""}
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
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.document_no || "—"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expiration Date</Text>
            <Text style={styles.infoValue}>
              {formatAUDate(item.document_expiry)}
            </Text>
          </View>

          {!item.file && (
            <Text style={{ color: "#ff6b6b", fontSize: 12, marginTop: 8 }}>
              File missing (404)
            </Text>
          )}

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => openFile(item.file)}
              activeOpacity={0.85}
            >
              <Eye size={17} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.viewBtnText}>
                {isImg ? "VIEW IMAGE" : "VIEW / DOWNLOAD"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.85}
            >
              <Pencil size={16} color={THEME.teal} style={{ marginRight: 6 }} />
              <Text style={styles.editBtnText}>EDIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderEmptyCard = (item: Document) => {
    // Empty / missing document card — no yellow dashed highlight.
    // Add Document button uses a red border so missing items stand out.
    // Staff-only: points this document would contribute once uploaded.
    const docPoints = isStaff ? getStaffDocPoints(item) : 0;

    const openAdd = () =>
      handleOpenAddModal({
        label: item.document_name,
        value: item.document_name,
        category: item.document_category || item.document_type,
      });

    return (
      <LinearGradient
        colors={["#171d30", "#0f1322"]}
        style={[
          styles.cardGradientWrapper,
          {
            borderStyle: "dashed",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardInnerContainer}>
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
              <View style={styles.emptyCardTitleRow}>
                <Text
                  style={[
                    styles.cardDocName,
                    { color: THEME.textMuted, flex: 1 },
                  ]}
                >
                  {getDisplayName(item.document_name)}
                  {isStaff && isStaffooStaffUser
                    ? ` (${docPoints} points)`
                    : ""}
                </Text>
                {isContractor && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
                Add Required Document
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.addCardButton,
              isContractor && styles.addCardButtonMissing,
            ]}
            onPress={openAdd}
            activeOpacity={0.8}
          >
            <PlusCircle
              size={16}
              color={isContractor ? "#ff6b6b" : THEME.teal}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.addCardButtonText,
                isContractor && { color: "#ff6b6b" },
              ]}
            >
              ADD DOCUMENT
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  const renderItem = ({ item }: { item: Document }) => {
    const isFilled = !!(item.file && item.file.trim().length > 0);
    return isFilled ? renderFilledCard(item) : renderEmptyCard(item);
  };

  const renderStateTabs = () => {
    if (!isContractor || contractorStateTabs.length === 0) return null;

    // Sort: incomplete tabs first, complete tabs last
    const sortedTabs = [...contractorStateTabs].sort((a, b) => {
      const aDocs = uploadedDocuments.filter(
        (d) => d.document_category === a.category,
      );
      const aComplete =
        aDocs.length > 0 &&
        aDocs.every((d) => !!(d.file && String(d.file).trim().length > 0));

      const bDocs = uploadedDocuments.filter(
        (d) => d.document_category === b.category,
      );
      const bComplete =
        bDocs.length > 0 &&
        bDocs.every((d) => !!(d.file && String(d.file).trim().length > 0));

      // Incomplete (false) comes before complete (true)
      if (aComplete === bComplete) return 0;
      return aComplete ? 1 : -1;
    });

    return (
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {sortedTabs.map((tab) => {
            const isActive = tab.category === selectedStateCategory;
            const tabDocs = uploadedDocuments.filter(
              (d) => d.document_category === tab.category,
            );
            // Complete only when every doc for this state has its own file
            const tabComplete =
              tabDocs.length > 0 &&
              tabDocs.every(
                (d) => !!(d.file && String(d.file).trim().length > 0),
              );

            return (
              <TouchableOpacity
                key={tab.category}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedStateCategory(tab.category)}
              >
                <View
                  style={[
                    styles.tabCompletionDot,
                    tabComplete
                      ? styles.tabCompletionDotDone
                      : styles.tabCompletionDotPending,
                  ]}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive && styles.tabButtonTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030508" />

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
      {renderStateTabs()}

      {isStaff && isStaffooStaffUser && !loadingDocs && (
        <View style={styles.pointsCardWrap}>
          <View style={styles.pointsCard}>
            <View style={styles.pointsCardHeaderRow}>
              <View style={styles.pointsCardIconWrap}>
                <IdCard size={20} color="#0A7C6E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointsCardTitle}>
                  100-Point Identification Check
                </Text>
                <Text style={styles.pointsCardSubtitle}>
                  Upload eligible identity documents to reach a minimum of 100
                  points to proceed to verification forms.
                </Text>
              </View>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>
                  {staffDocumentPointsRaw} / 100 Points
                </Text>
              </View>
            </View>

            <View style={styles.pointsProgressTrack}>
              <View
                style={[
                  styles.pointsProgressFill,
                  { width: `${staffDocumentCompletionPercentage}%` },
                ]}
              />
            </View>

            {isStaffDocumentsComplete ? (
              <View style={styles.pointsMetRow}>
                <CheckCircle2 size={16} color="#0A7C6E" />
                <Text style={styles.pointsMetText}>
                  Requirement met! You have reached 100+ points and can proceed.
                </Text>
              </View>
            ) : (
              <View style={styles.pointsMetRow}>
                <AlertCircle size={16} color="#B5790A" />
                <Text style={styles.pointsNeededText}>
                  {100 - staffDocumentPointsRaw} more point
                  {100 - staffDocumentPointsRaw === 1 ? "" : "s"} needed to
                  proceed.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {loadingDocs ? (
        <ActivityIndicator
          size="large"
          color={THEME.teal}
          style={{ marginTop: 60 }}
        />
      ) : isStaff && !isStaffPersonalInfoComplete ? (
        <View style={styles.lockedContainer}>
          <Lock size={40} color={THEME.textMuted} />
          <Text style={styles.lockedTitle}>Complete Your Profile First</Text>
          <Text style={styles.lockedSubtitle}>
            Please finish your personal information (gender, security licence
            number
            {userProfile?.user_id === 1
              ? ", date of birth, country of birth and visa status"
              : ""}
            ) before you can upload documents.
          </Text>
          <TouchableOpacity
            style={styles.lockedButton}
            onPress={() => navigation.navigate("ProfileSetup")}
            activeOpacity={0.85}
          >
            <Text style={styles.lockedButtonText}>Complete Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={displayedDocuments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <>
                {/* Existing incomplete banner (contractors) */}
                {showIncompleteTopBanner && !isProfileComplete ? (
                  <View style={styles.incompleteTopBanner}>
                    <AlertCircle
                      size={18}
                      color="#ff6b6b"
                      style={{ marginRight: 10, marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.incompleteTopBannerTitle}>
                        Please complete all required documents
                      </Text>
                      <Text style={styles.incompleteTopBannerText}>
                        Upload the missing documents below before proceeding to
                        Rates.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowIncompleteTopBanner(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={18} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* NEW: Expired documents banner */}
                {hasExpiredDocuments ? (
                  <View
                    style={[
                      styles.incompleteTopBanner,
                      {
                        marginTop:
                          showIncompleteTopBanner && !isProfileComplete
                            ? 10
                            : 0,
                      },
                    ]}
                  >
                    <AlertCircle
                      size={18}
                      color="#ff6b6b"
                      style={{ marginRight: 10, marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.incompleteTopBannerTitle}>
                        {expiredDocuments.length === 1
                          ? "1 document has expired"
                          : `${expiredDocuments.length} documents have expired`}
                      </Text>
                      <Text style={styles.incompleteTopBannerText}>
                        {expiredDocuments
                          .map((d) => getDisplayName(d.document_name))
                          .join(", ")}
                        . Please update{" "}
                        {expiredDocuments.length === 1 ? "it" : "them"} to keep
                        your profile valid.
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No documents found</Text>
            }
          />

          {isContractor && uploadedDocuments.length > 0 && (
            <View style={styles.bottomActionWrap}>
              <TouchableOpacity
                style={styles.proceedRatesButton}
                onPress={handleProceedRates}
                activeOpacity={0.85}
              >
                <Text style={styles.proceedRatesButtonText}>NEXT</Text>
                <ChevronRight size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {isStaff && isStaffooStaffUser && uploadedDocuments.length > 0 && (
            <View style={styles.bottomActionWrap}>
              {!isStaffDocumentsComplete && (
                <Text style={styles.proceedHintText}>
                  Reach 100% document completion to unlock the next step.
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.proceedRatesButton,
                  !isStaffDocumentsComplete &&
                    styles.proceedRatesButtonDisabled,
                ]}
                onPress={handleStaffProceedNext}
                activeOpacity={0.85}
                disabled={!isStaffDocumentsComplete}
              >
                <Text style={styles.proceedRatesButtonText}>
                  {isStaffDocumentsComplete
                    ? "NEXT"
                    : `NEXT (${staffDocumentPointsRaw}/100)`}
                </Text>
                <ChevronRight size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <Modal
        animationType="fade"
        transparent
        visible={incompleteModalVisible}
        onRequestClose={() => setIncompleteModalVisible(false)}
      >
        <View style={styles.incompleteModalOverlay}>
          <View style={styles.incompleteModalCard}>
            <View style={styles.incompleteModalHeader}>
              <AlertCircle size={22} color="#F5A623" />
              <Text style={styles.incompleteModalTitle}>
                Incomplete information
              </Text>
              <TouchableOpacity
                onPress={() => setIncompleteModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.incompleteModalSubtitle}>
              The following information is incomplete. Please complete the
              required documents before proceeding.
            </Text>

            <ScrollView
              style={styles.incompleteModalScroll}
              showsVerticalScrollIndicator={false}
            >
              {missingDocumentsByState.map((group) => (
                <View key={group.stateLabel} style={styles.incompleteGroup}>
                  <Text style={styles.incompleteGroupTitle}>
                    {group.stateLabel}
                  </Text>
                  {group.items.map((name, idx) => (
                    <View
                      key={`${group.stateLabel}-${name}-${idx}`}
                      style={styles.incompleteItemRow}
                    >
                      <View style={styles.incompleteItemDot} />
                      <Text style={styles.incompleteItemText}>
                        {name === "No documents assigned for this state yet"
                          ? name
                          : getDisplayName(name)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            {/* <TouchableOpacity
              style={styles.incompleteModalBtn}
              onPress={() => setIncompleteModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.incompleteModalBtnText}>
                OK — I will complete these
              </Text>
            </TouchableOpacity> */}
          </View>
        </View>
      </Modal>

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

              {isVisaSelected ? (
                <>
                  {/* ── Passport Number for Verification ── */}
                  <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
                    PASSPORT NUMBER FOR VERIFICATION *
                  </Text>
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
                      placeholder="Enter passport number"
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
                        setShowWorkDocument(false);
                        setWorkEntitlement(null);
                        setWorkRightsError("");
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
                  {docNumberError ? (
                    <Text style={styles.errorText}>{docNumberError}</Text>
                  ) : null}
                  {!isBridgingVisaDocument() && (
                    <Text style={styles.inputHelpText}>
                      Tap "Verify" to validate this passport and auto-fill the
                      visa expiry date.
                    </Text>
                  )}

                  {/* ── Visa Grant Number ── */}
                  <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
                    VISA GRANT NUMBER *
                  </Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Enter visa grant number"
                    placeholderTextColor={THEME.textMuted}
                    value={visaGrantNumber}
                    maxLength={DOC_NO_MAX}
                    autoCapitalize="characters"
                    onChangeText={(text) => {
                      setVisaGrantNumber(text.toUpperCase());
                      setVisaGrantNumberError("");
                    }}
                  />
                  {visaGrantNumberError ? (
                    <Text style={styles.errorText}>{visaGrantNumberError}</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
                    DOCUMENT NUMBER *
                  </Text>
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
                      onChangeText={(text) =>
                        setDocumentNumber(text.toUpperCase())
                      }
                    />
                  )}
                  {docNumberError ? (
                    <Text style={styles.errorText}>{docNumberError}</Text>
                  ) : null}
                  {needsVerification && (
                    <Text style={styles.inputHelpText}>
                      Tap "Verify" to validate this document and auto-fill its
                      expiry date.
                    </Text>
                  )}
                </>
              )}

              {/* Expiration Date — hidden entirely for bridging-visa staff
                  on the Visa document, or when the visa check returned
                  show_document: true */}
              {!hideExpiryDate && (
                <>
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
                      textColor="#FFFFFF"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={handleExpiryDateChange}
                    />
                  )}
                  {Platform.OS === "ios" &&
                    showExpiryPicker &&
                    !isExpiryLocked && (
                      <TouchableOpacity
                        style={styles.iosPickerDoneButton}
                        onPress={() => setShowExpiryPicker(false)}
                      >
                        <Text style={styles.iosPickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}
                </>
              )}

              {workEntitlement && (
                <View style={styles.workEntitlementBanner}>
                  <Text style={styles.workEntitlementLabel}>
                    Work Entitlement
                  </Text>
                  <Text style={styles.workEntitlementValue}>
                    {workEntitlement}
                  </Text>
                </View>
              )}

              {showWorkDocument && (
                <View style={styles.workRightsSection}>
                  <View style={styles.sectionHeader}>
                    <FileText
                      size={18}
                      color={THEME.teal}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.sectionTitle}>
                      Work Rights Document
                    </Text>
                  </View>
                  {renderWorkRightsPreview()}
                  <TouchableOpacity
                    style={[
                      styles.uploadBtn,
                      uploadingWorkRights && styles.disabledBtn,
                    ]}
                    onPress={handleWorkRightsUpload}
                    disabled={uploadingWorkRights}
                    activeOpacity={0.8}
                  >
                    <CloudUpload
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.uploadBtnText}>
                      {uploadingWorkRights
                        ? "UPLOADING..."
                        : "UPLOAD WORK RIGHTS DOCUMENT"}
                    </Text>
                  </TouchableOpacity>
                  {!!workRightsError && (
                    <Text style={styles.errorText}>{workRightsError}</Text>
                  )}
                </View>
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
                <Text style={styles.saveButtonText}>
                  {isEditing ? "UPDATE DOCUMENT" : "SAVE DOCUMENT"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

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

  // ── State Tabs ──
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.background,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: "#0A7C6E",
    borderColor: "#0A7C6E",
  },
  tabButtonText: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  tabCompletionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tabCompletionDotDone: {
    backgroundColor: "#34C88A",
  },
  tabCompletionDotPending: {
    backgroundColor: "#F5A623",
  },

  // ── Staff "100-Point Identification Check" card ──
  pointsCardWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  pointsCard: {
    backgroundColor: "#EAFBF3",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#0A7C6E",
  },
  pointsCardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pointsCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(10,124,110,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  pointsCardTitle: {
    color: "#0B2E28",
    fontSize: 12,
    fontWeight: "800",
  },
  pointsCardSubtitle: {
    color: "#4B5A56",
    fontSize: 9,
    marginTop: 3,
    lineHeight: 12,
  },
  pointsBadge: {
    backgroundColor: "#0A7C6E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    alignSelf: "flex-start",
  },
  pointsBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 9,
  },
  pointsProgressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(10,124,110,0.15)",
    marginTop: 14,
    overflow: "hidden",
  },
  pointsProgressFill: {
    height: "100%",
    backgroundColor: "#0A7C6E",
    borderRadius: 6,
  },
  pointsMetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  pointsMetText: {
    color: "#0A7C6E",
    fontSize: 12.5,
    fontWeight: "700",
    flex: 1,
  },
  pointsNeededText: {
    color: "#B5790A",
    fontSize: 12.5,
    fontWeight: "700",
    flex: 1,
  },

  // ── Locked (personal info incomplete) state ──
  lockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  lockedTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16,
    textAlign: "center",
  },
  lockedSubtitle: {
    color: THEME.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  lockedButton: {
    marginTop: 22,
    backgroundColor: "#0A7C6E",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  lockedButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  listContent: { padding: 16, paddingBottom: 40 },
  emptyText: {
    textAlign: "center",
    marginTop: 60,
    color: THEME.textMuted,
    fontSize: 15,
  },

  // ── Bottom action (contractor "Proceed to My Rates" / staff "Next") ──
  bottomActionWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: THEME.background,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  proceedHintText: {
    color: "#d1cdcd",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 16,
  },
  proceedRatesButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A7C6E",
    height: 52,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.2)",
  },
  proceedRatesButtonDisabled: {
    opacity: 0.45,
  },
  proceedRatesButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
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
  workEntitlementBanner: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "rgba(0, 200, 180, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 200, 180, 0.35)",
  },
  workEntitlementLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  workEntitlementValue: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.teal,
  },
  divider: { height: 1, backgroundColor: THEME.border, marginVertical: 12 },

  viewBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  editBtnText: { color: THEME.teal, fontSize: 13, fontWeight: "bold" },

  // Top banner shown after tapping Next while docs are incomplete
  incompleteTopBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,107,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.45)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  incompleteTopBannerTitle: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  incompleteTopBannerText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 19,
  },

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
  modalBody: { padding: 16, backgroundColor: "#111111" },

  imageUploadArea: { alignItems: "center", marginBottom: 20 },

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
  workRightsSection: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.textMain,
  },

  // ─── Preview Containers ────────────────────────────
  imagePlaceholder: {
    width: "100%",
    height: 160,
    // backgroundColor: THEME.cardBg,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  errorPreviewContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  previewText: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 8,
    textAlign: "center",
  },

  // Document File Card Preview
  docPreviewCard: {
    width: "100%",
    padding: 16,
    backgroundColor: THEME.cardBg,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  docPreviewIconWrap: {
    marginBottom: 8,
  },
  docPreviewLabel: {
    fontSize: 13,
    color: THEME.textMain,
    textAlign: "center",
    marginBottom: 10,
  },
  viewDocButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.tealDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewDocButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  // ─── Upload Button ────────────────────────────────
  uploadBtn: {
    flexDirection: "row",
    backgroundColor: "#0A7C6E",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    // letterSpacing: 0.5,
  },

  // Disabled State
  disabledBtn: {
    opacity: 0.6,
  },
  // Outer gradient boundary (No padding here)
  cardGradientWrapper: {
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    overflow: "hidden",
  },

  // Inner container handling correct iOS padding
  cardInnerContainer: {
    padding: 16,
    width: "100%",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  infoLabel: {
    color: THEME.textMuted,
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },

  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  viewBtn: {
    backgroundColor: THEME.accent,
    height: 40,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    height: 40,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(137,231,208,0.08)",
    borderWidth: 1,
    borderColor: "rgba(137,231,208,0.25)",
  },

  emptyCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  incompleteBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(245,166,35,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.4)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  incompleteBannerTitle: {
    color: "#F5A623",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  incompleteBannerText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 19,
  },
  incompleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  incompleteModalCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.35)",
    maxHeight: "78%",
    overflow: "hidden",
  },
  incompleteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  incompleteModalTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  incompleteModalSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  incompleteModalScroll: {
    paddingHorizontal: 16,
    maxHeight: 320,
  },
  incompleteGroup: {
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  incompleteGroupTitle: {
    color: THEME.teal,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  incompleteItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  incompleteItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F5A623",
    marginTop: 6,
    marginRight: 10,
  },
  incompleteItemText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  incompleteModalBtn: {
    margin: 16,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(245,166,35,0.2)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  incompleteModalBtnText: {
    color: "#F5A623",
    fontSize: 14,
    fontWeight: "800",
  },

  emptyCardHighlight: {
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#F5A623",
  },

  emptyDocIconBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  requiredBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  requiredBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  emptyCardHint: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },

  addCardButtonHighlight: {
    height: 42,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },

  addCardButtonTextHighlight: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  addCardButtonMissing: {
    borderColor: "#ff6b6b",
    borderWidth: 1.5,
    backgroundColor: "rgba(255,107,107,0.08)",
  },
  addCardButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.teal,
  },
});
