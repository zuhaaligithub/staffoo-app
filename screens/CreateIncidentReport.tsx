// import React, { useState, useRef } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   TextInput,
//   Image,
//   Alert,
//   Dimensions,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
// } from "react-native";

// import {
//   ChevronLeft,
//   ChevronDown,
//   Calendar,
//   AlertCircle,
//   FileText,
//   Users,
//   Car,
//   Siren,
//   Eye,
//   UploadCloud,
//   PenTool,
//   X,
//   Plus,
//   Minus,
// } from "lucide-react-native";

// import { launchCamera, launchImageLibrary } from "react-native-image-picker";
// import SignatureScreen from "react-native-signature-canvas";
// import { BASE_URL, getAuthToken } from "../services/authApi";
// import RNFS from "react-native-fs";
// import ImageResizer from "react-native-image-resizer";
// import Toast from "react-native-toast-message";
// // import { OPENAI_API_KEY } from './config/aiConfig';

// const { width } = Dimensions.get("window");

// interface InjuryType {
//   id: number;
//   name: string;
//   color: string;
//   background: string;
// }

// interface EmergencyType {
//   id: number;
//   name: string;
//   color: string;
//   background: string;
// }

// interface PersonDetail {
//   name: string;
//   email: string;
//   phone: string;
//   bodyType: string;
//   gender: string;
//   hair: string;
//   height: string;
//   weight: string;
//   marks: string;
// }

// interface VehicleDetail {
//   make: string;
//   model: string;
//   rego: string;
//   vehicleType: string;
// }

// interface WitnessDetail {
//   name: string;
//   email: string;
//   address: string;
//   phone: string;
//   detail: string;
//   moreInfo: string;
// }

// interface PhotoItem {
//   uri: string;
//   timestamp: string;
// }

// const COLORS = {
//   background: "#030508",
//   surface: "#07111A",
//   card: "#0D1421",
//   cardBorder: "rgba(98, 97, 97, 0.83)",
//   primary: "#00A99D",
//   primaryGlow: "rgba(0,169,157,0.25)",
//   primaryBorder: "rgba(0,169,157,0.25)",
//   text: "#FFFFFF",
//   textSecondary: "#94A3B8",
//   textMuted: "#4A6080",
//   success: "#34C88A",
//   danger: "#F87171",
//   dangerBg: "rgba(248,88,88,0.12)",
//   warning: "#F5A623",
//   warningBg: "rgba(245,166,35,0.08)",
//   heroBg1: "#0D1F2D",
//   heroBg2: "#061014",
// };

// export default function CreateIncidentReport({
//   navigation,
//   route,
// }: {
//   navigation: any;
//   route: any;
// }) {
//   const { shiftId, guardId, rosterId, siteId, siteName } = route.params ?? {};

//   if (!siteId) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
//         <View
//           style={{
//             flex: 1,
//             justifyContent: "center",
//             alignItems: "center",
//             padding: 20,
//           }}
//         >
//           <Text style={{ fontSize: 18, color: "#ef4444", textAlign: "center" }}>
//             Missing required parameters (siteId is required)
//           </Text>
//           <TouchableOpacity
//             onPress={() => navigation.goBack()}
//             style={{
//               marginTop: 24,
//               paddingVertical: 14,
//               paddingHorizontal: 28,
//               backgroundColor: "#3b82f6",
//               borderRadius: 12,
//             }}
//           >
//             <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
//               Go Back
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   const [photos, setPhotos] = useState<PhotoItem[]>([]);
//   const [openSection, setOpenSection] = useState<string | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const toggleSection = (section: string) => {
//     setOpenSection(openSection === section ? null : section);
//   };

//   const now = new Date();

//   // UI display (safe)
//   const incidentDateTimeDisplay = now.toLocaleString("en-AU", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   // Format date: DD/MM/YYYY
//   const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
//     now.getMonth() + 1,
//   ).padStart(2, "0")}/${now.getFullYear()}`;

//   // Format time: HH:mm:ss
//   const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
//     now.getMinutes(),
//   ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

//   const monthMap: { [key: string]: string } = {
//     Jan: "01",
//     Feb: "02",
//     Mar: "03",
//     Apr: "04",
//     May: "05",
//     Jun: "06",
//     Jul: "07",
//     Aug: "08",
//     Sep: "09",
//     Oct: "10",
//     Nov: "11",
//     Dec: "12",
//   };

//   // Form States
//   const [selectedIncidentTypeId, setSelectedIncidentTypeId] = useState<
//     number | null
//   >(null);
//   const [otherIncidentType, setOtherIncidentType] = useState("");
//   const [incidentDetails, setIncidentDetails] = useState("");

//   const [peopleCount, setPeopleCount] = useState(0);
//   const [peopleDetails, setPeopleDetails] = useState<PersonDetail[]>([]);

//   const [vehiclesCount, setVehiclesCount] = useState(0);
//   const [vehicleDetails, setVehicleDetails] = useState<VehicleDetail[]>([]);

//   const [selectedEmergencyId, setSelectedEmergencyId] = useState<number | null>(
//     null,
//   );
//   const [emergencyDetail, setEmergencyDetail] = useState("");
//   const [supervisorName, setSupervisorName] = useState("");
//   const [supervisorPosition, setSupervisorPosition] = useState("");
//   const [supervisorAddress, setSupervisorAddress] = useState("");
//   const [supervisorEmail, setSupervisorEmail] = useState("");
//   const [supervisorPhone, setSupervisorPhone] = useState("");

//   const [witnessesCount, setWitnessesCount] = useState(0);
//   const [witnessDetails, setWitnessDetails] = useState<WitnessDetail[]>([]);

//   const signatureRef = useRef<any>(null);
//   const [signatureData, setSignatureData] = useState<string | null>(null);

//   const injuryTypes: InjuryType[] = [
//     { id: 5, name: "Forced Entry", color: "#B4850F", background: "#FFFCCA" },
//     { id: 1, name: "Injury", color: "#E80000", background: "#FFDADA" },
//     { id: 2, name: "Trespassing", color: "#672195", background: "#EDD2FF" },
//     { id: 3, name: "Refused Entry", color: "#215F8C", background: "#DAEFFF" },
//     { id: 4, name: "Robbery", color: "#000000", background: "#DEDEDE" },
//     { id: 6, name: "Others", color: "#000000", background: "#FFFFFF" },
//   ];

//   const emergencyTypes: EmergencyType[] = [
//     { id: 1, name: "Police", background: "#DAEFFF", color: "#0D2F86" },
//     { id: 2, name: "Ambulance", background: "#FFDADA", color: "#E80000" },
//     { id: 3, name: "Fire Brigade", background: "#FFFCCA", color: "#B4850F" },
//   ];

//   const selectedIncidentName =
//     injuryTypes.find((t) => t.id === selectedIncidentTypeId)?.name || "Others";

//   // AI Text Correction
//   const correctText = async (text: string, instruction: string) => {
//     if (!text?.trim()) {
//       Alert.alert("No text", "Please enter some incident details first.");
//       return;
//     }

//     try {
//       const payload = {
//         model: "gpt-4o-mini",
//         messages: [
//           {
//             role: "system",
//             content:
//               "You are a professional security report editor. Be concise, factual, formal. Never invent new information.",
//           },
//           {
//             role: "user",
//             content: `${instruction}:\n\n${text}`,
//           },
//         ],
//         temperature: 0.4,
//         max_tokens: 300,
//       };

//       const response = await fetch(
//         "https://api.openai.com/v1/chat/completions",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             // Authorization: `Bearer ${OPENAI_API_KEY}`,
//           },
//           body: JSON.stringify(payload),
//         },
//       );

//       const data = await response.json();
//       const correctedText = data.choices?.[0]?.message?.content?.trim();

//       if (correctedText) {
//         setIncidentDetails(correctedText);
//       } else {
//         throw new Error("No correction received");
//       }
//     } catch (error: any) {
//       console.error("OpenAI error:", error);
//       Alert.alert("AI Error", "Text correction failed. Please try again.");
//     }
//   };

//   // Resize for preview
//   const resizeForPreview = async (uri: string): Promise<string> => {
//     try {
//       const resized = await ImageResizer.createResizedImage(
//         uri,
//         800,
//         800,
//         "JPEG",
//         60,
//       );
//       return resized.uri;
//     } catch {
//       return uri;
//     }
//   };

//   // Convert to base64 for submission (memory efficient)
//   const convertToBase64ForSubmit = async (uri: string): Promise<string> => {
//     try {
//       const resized = await ImageResizer.createResizedImage(
//         uri,
//         600,
//         600,
//         "JPEG",
//         50,
//       );
//       const base64 = await RNFS.readFile(resized.uri, "base64");
//       return `data:image/jpeg;base64,${base64}`;
//     } catch (e) {
//       throw new Error("Failed to process image");
//     }
//   };

//   const isValidEmail = (email: string) =>
//     !email || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

//   const updateArrayItem = <T extends object>(
//     arr: T[],
//     index: number,
//     updates: Partial<T>,
//   ): T[] =>
//     arr.map((item, i) => (i === index ? { ...item, ...updates } : item));

//   const changeCount = (
//     field: "people" | "vehicles" | "witnesses",
//     delta: number,
//   ) => {
//     const max = 10;
//     let count = 0;
//     let setCount: any;
//     let details: any[] = [];
//     let setDetails: any;

//     if (field === "people") {
//       count = peopleCount;
//       setCount = setPeopleCount;
//       details = peopleDetails;
//       setDetails = setPeopleDetails;
//     } else if (field === "vehicles") {
//       count = vehiclesCount;
//       setCount = setVehiclesCount;
//       details = vehicleDetails;
//       setDetails = setVehicleDetails;
//     } else {
//       count = witnessesCount;
//       setCount = setWitnessesCount;
//       details = witnessDetails;
//       setDetails = setWitnessDetails;
//     }

//     const next = Math.max(0, Math.min(max, count + delta));
//     setCount(next);

//     if (next > count) {
//       let empty: any;
//       if (field === "people")
//         empty = {
//           name: "",
//           email: "",
//           phone: "",
//           bodyType: "",
//           gender: "",
//           hair: "",
//           height: "",
//           weight: "",
//           marks: "",
//         };
//       else if (field === "vehicles")
//         empty = { make: "", model: "", rego: "", vehicleType: "" };
//       else
//         empty = {
//           name: "",
//           email: "",
//           address: "",
//           phone: "",
//           detail: "",
//           moreInfo: "",
//         };

//       setDetails([...details, empty]);
//     } else if (next < count) {
//       setDetails(details.slice(0, -1));
//     }
//   };

//   const pickImage = () => {
//     const remainingSlots = 6 - photos.length;

//     if (remainingSlots <= 0) {
//       return Alert.alert("Limit Reached", "Maximum 6 photos allowed.");
//     }

//     Alert.alert("Add Photos", "Choose how you'd like to add your photos.", [
//       {
//         text: "Take Photo",
//         onPress: () =>
//           launchCamera(
//             {
//               mediaType: "photo",
//               quality: 0.8,
//             },
//             handleMultipleImages,
//           ),
//       },
//       {
//         text: "Choose from Photos",
//         onPress: () =>
//           launchImageLibrary(
//             {
//               mediaType: "photo",
//               quality: 0.8,
//               selectionLimit: remainingSlots,
//             } as any,
//             handleMultipleImages,
//           ),
//       },
//       {
//         text: "Cancel",
//         style: "cancel",
//       },
//     ]);
//   };
//   // Replace your old handleImage with this:
//   const handleMultipleImages = async (response: any) => {
//     if (
//       response.didCancel ||
//       !response.assets ||
//       response.assets.length === 0
//     ) {
//       return;
//     }

//     const newPhotos: PhotoItem[] = [];

//     for (const asset of response.assets) {
//       // Stop if we reached the limit
//       if (photos.length + newPhotos.length >= 6) break;

//       try {
//         const previewUri = await resizeForPreview(asset.uri);
//         const timestamp = new Date().toLocaleString("en-AU", {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//           hour12: false,
//         });

//         newPhotos.push({ uri: previewUri, timestamp });
//       } catch (err) {
//         console.warn("Failed to process image:", err);
//       }
//     }

//     if (newPhotos.length > 0) {
//       setPhotos((prev) => [...prev, ...newPhotos]);

//       Toast.show({
//         type: "success",
//         text1: `${newPhotos.length} photo(s) added successfully`,
//         position: "bottom",
//       });
//     }
//   };

//   const handleImage = async (response: any) => {
//     if (response.didCancel || !response.assets?.[0]?.uri) return;

//     const asset = response.assets[0];

//     try {
//       const previewUri = await resizeForPreview(asset.uri);
//       const timestamp = new Date().toLocaleString("en-AU", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: false,
//       });

//       setPhotos((prev) => [...prev, { uri: previewUri, timestamp }]);
//     } catch (err) {
//       Alert.alert("Error", "Failed to process image");
//     }
//   };

//   const removePhoto = (index: number) =>
//     setPhotos(photos.filter((_, i) => i !== index));

//   const handleSaveSignature = () => {
//     signatureRef.current?.readSignature();
//   };

//   const handleClearSignature = () => {
//     signatureRef.current?.clearSignature();
//     setSignatureData(null);
//   };

//   const submitReport = async () => {
//     if (!selectedIncidentTypeId)
//       return Alert.alert("Required", "Incident Type is required");

//     if (!incidentDetails.trim())
//       return Alert.alert("Required", "Incident Details are required");
//     if (!signatureData)
//       return Alert.alert("Required", "Staff signature is required");

//     setIsSubmitting(true);

//     // Small delay + requestAnimationFrame for iOS stability
//     requestAnimationFrame(() => {
//       setTimeout(async () => {
//         try {
//           const token = await getAuthToken();
//           if (!token) throw new Error("No authentication token found");

//           // Process photos sequentially (memory safe)
//           const photoPayload = [];
//           for (const photo of photos) {
//             const base64 = await convertToBase64ForSubmit(photo.uri);
//             photoPayload.push({ imgPath: base64, timestamp: photo.timestamp });
//           }

//           const payload = {
//             guard_id: guardId,
//             roster_id: rosterId,
//             date: formattedDate,
//             time: formattedTime,
//             site_name: siteName || "Unknown Site",
//             injury_type: selectedIncidentName,
//             incident_detail: incidentDetails.trim(),
//             people_involved: peopleDetails.map((p) => ({
//               name: p.name || "",
//               phone: p.phone || "",
//               bodyType: p.bodyType || "",
//               gender: p.gender || "",
//               hair: p.hair || "",
//               height: p.height || "",
//               weight: p.weight || "",
//               marks: p.marks || "",
//               email: p.email || "",
//             })),
//             vehicle: vehicleDetails.map((v) => ({
//               make: v.make || "",
//               model: v.model || "",
//               vehicle_type: v.vehicleType || "",
//               vehicle_rander: v.rego || "",
//             })),
//             emergency_services: {
//               emergency_type: selectedEmergencyId
//                 ? emergencyTypes.find((e) => e.id === selectedEmergencyId)
//                     ?.name || ""
//                 : "",
//               emergency_detail: emergencyDetail || "",
//               supervisor_name: supervisorName || "",
//               position: supervisorPosition || "",
//               address: supervisorAddress || "",
//               email: supervisorEmail || "",
//               phone: supervisorPhone || "",
//             },
//             wittness: witnessDetails.map((w) => ({
//               wittness_detail: w.detail || "",
//               wittness_name: w.name || "",
//               wittness_address: w.address || "",
//               wittness_email: w.email || "",
//               wittness_phone: w.phone || "",
//               witness_more_info: w.moreInfo || "",
//             })),
//             photo: photoPayload,
//             signature: signatureData,
//           };

//           const response = await fetch(
//             `${BASE_URL}/report-incident/${siteId}`,
//             {
//               method: "POST",
//               headers: {
//                 Authorization: `Bearer ${token}`,
//                 "Content-Type": "application/json",
//                 Accept: "application/json",
//               },
//               body: JSON.stringify(payload),
//             },
//           );

//           const responseData = await response.json().catch(() => ({}));

//           if (!response.ok) {
//             throw new Error(
//               responseData.message || `Server error: ${response.status}`,
//             );
//           }

//           Alert.alert("Success", "Incident report submitted successfully!", [
//             { text: "OK", onPress: () => navigation.goBack() },
//           ]);
//         } catch (error: any) {
//           console.error("Submit error:", error);
//           Alert.alert(
//             "Submission Failed",
//             error.message || "Failed to submit report. Please try again.",
//           );
//         } finally {
//           setIsSubmitting(false);
//         }
//       }, 100);
//     });
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1 }}
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()}>
//             <ChevronLeft size={28} color="#fff" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Create Incident Report</Text>
//           <View style={{ width: 28 }} />
//         </View>

//         <ScrollView
//           contentContainerStyle={styles.scrollContent}
//           keyboardShouldPersistTaps="handled"
//         >
//           {isSubmitting && (
//             <View style={styles.submittingOverlay}>
//               <ActivityIndicator size="large" color="#3b82f6" />
//               <Text style={styles.submittingText}>Submitting Report...</Text>
//             </View>
//           )}

//           {/* All sections (Date, Type, Details, People, Vehicles, Emergency, Witness, Photos, Signature) are kept exactly as you had them */}
//           {/* 1. Incident Date/Time */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("date")}
//           >
//             <View style={styles.cardHeader}>
//               <Calendar size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>Incident Date/Time</Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "date" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>
//           {openSection === "date" && (
//             <View style={styles.cardContent}>
//               <TextInput
//                 style={[styles.input, styles.readonly]}
//                 value={incidentDateTimeDisplay}
//                 editable={false}
//               />
//             </View>
//           )}

//           {/* 2. Incident Type */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("type")}
//           >
//             <View style={styles.cardHeader}>
//               <AlertCircle size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>
//                 Incident Type <Text style={styles.required}>*</Text>
//               </Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "type" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>

//           {openSection === "type" && (
//             <View style={styles.cardContent}>
//               <View style={styles.chipContainer}>
//                 {injuryTypes.map((item) => (
//                   <TouchableOpacity
//                     key={item.id}
//                     style={[
//                       styles.chip,
//                       selectedIncidentTypeId === item.id && styles.chipActive,
//                       { backgroundColor: item.background },
//                     ]}
//                     onPress={() => {
//                       setSelectedIncidentTypeId(item.id);
//                       if (item.id !== 6) {
//                         setOtherIncidentType(""); // Clear when switching away from Others
//                       }
//                     }}
//                   >
//                     <Text style={[styles.chipText, { color: item.color }]}>
//                       {item.name}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>

//               {/* Show input ONLY when "Others" is selected */}
//               {selectedIncidentTypeId === 6 && (
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Please specify the other incident type..."
//                   placeholderTextColor="#9CA3AF"
//                   value={otherIncidentType}
//                   onChangeText={setOtherIncidentType}
//                   multiline
//                 />
//               )}
//             </View>
//           )}

//           {/* 3. Incident Details */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("details")}
//           >
//             <View style={styles.cardHeader}>
//               <FileText size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>
//                 Incident Details <Text style={styles.required}>*</Text>
//               </Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "details" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>
//           {openSection === "details" && (
//             <View style={styles.cardContent}>
//               <TextInput
//                 style={styles.textArea}
//                 multiline
//                 placeholder="Enter details here..."
//                 placeholderTextColor="#9CA3AF"
//                 value={incidentDetails}
//                 onChangeText={setIncidentDetails}
//               />
//               {/* <View style={styles.aiButtons}>
//                 <TouchableOpacity
//                   style={styles.spellBtn}
//                   onPress={() => correctText(incidentDetails, "Correct this")}
//                 >
//                   <Text style={styles.btnText}>Spell check only</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={styles.aiBtn}
//                   onPress={() =>
//                     correctText(
//                       incidentDetails,
//                       "Change this text to more professional and detailed text with correct grammar and spellings:",
//                     )
//                   }
//                 >
//                   <Text style={styles.btnText}>Change with AI</Text>
//                 </TouchableOpacity>
//               </View> */}
//             </View>
//           )}

//           {/* 4. People Involved */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("people")}
//           >
//             <View style={styles.cardHeader}>
//               <Users size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>People Involved</Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "people" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>
//           {openSection === "people" && (
//             <View style={styles.cardContent}>
//               <View style={styles.counterRow}>
//                 <TouchableOpacity onPress={() => changeCount("people", -1)}>
//                   <Minus size={24} color="#64748b" />
//                 </TouchableOpacity>
//                 <Text style={styles.countText}>{peopleCount}</Text>
//                 <TouchableOpacity onPress={() => changeCount("people", 1)}>
//                   <Plus size={24} color="#3b82f6" />
//                 </TouchableOpacity>
//               </View>

//               {peopleDetails.map((p, i) => (
//                 <View key={i} style={styles.detailGroup}>
//                   <Text style={styles.subTitle}>Detail {i + 1}</Text>

//                   <Text style={styles.label}>Full Name</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={p.name}
//                     placeholder="Person Name"
//                     placeholderTextColor="#9CA3AF"
//                     onChangeText={(v) =>
//                       setPeopleDetails(
//                         updateArrayItem(peopleDetails, i, { name: v }),
//                       )
//                     }
//                   />

//                   <Text style={styles.label}>Email</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={p.email}
//                     placeholder="Person Email"
//                     placeholderTextColor="#9CA3AF"
//                     onChangeText={(v) =>
//                       setPeopleDetails(
//                         updateArrayItem(peopleDetails, i, { email: v }),
//                       )
//                     }
//                     keyboardType="email-address"
//                   />
//                   {p.email && !isValidEmail(p.email) && (
//                     <Text style={styles.error}>Invalid email format</Text>
//                   )}

//                   <Text style={styles.label}>Phone</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={p.phone}
//                     placeholder="Person Phone"
//                     placeholderTextColor="#9CA3AF"
//                     onChangeText={(v) =>
//                       setPeopleDetails(
//                         updateArrayItem(peopleDetails, i, { phone: v }),
//                       )
//                     }
//                     keyboardType="phone-pad"
//                   />

//                   <View style={styles.row}>
//                     <View style={{ flex: 1, marginRight: 8 }}>
//                       <Text style={styles.label}>Body Type</Text>
//                       <TextInput
//                         style={styles.input}
//                         value={p.bodyType}
//                         placeholder="Body Type"
//                         placeholderTextColor="#9CA3AF"
//                         onChangeText={(v) =>
//                           setPeopleDetails(
//                             updateArrayItem(peopleDetails, i, { bodyType: v }),
//                           )
//                         }
//                       />
//                     </View>
//                     <View style={{ flex: 1 }}>
//                       <Text style={styles.label}>Gender</Text>
//                       <TextInput
//                         style={styles.input}
//                         value={p.gender}
//                         placeholder="Gender"
//                         placeholderTextColor="#9CA3AF"
//                         onChangeText={(v) =>
//                           setPeopleDetails(
//                             updateArrayItem(peopleDetails, i, { gender: v }),
//                           )
//                         }
//                       />
//                     </View>
//                   </View>

//                   <View style={styles.row}>
//                     <View style={{ flex: 1, marginRight: 8 }}>
//                       <Text style={styles.label}>Hair Color</Text>
//                       <TextInput
//                         style={styles.input}
//                         value={p.hair}
//                         placeholder="Hair Color"
//                         placeholderTextColor="#9CA3AF"
//                         onChangeText={(v) =>
//                           setPeopleDetails(
//                             updateArrayItem(peopleDetails, i, { hair: v }),
//                           )
//                         }
//                       />
//                     </View>
//                     <View style={{ flex: 1 }}>
//                       <Text style={styles.label}>Height</Text>
//                       <TextInput
//                         style={styles.input}
//                         value={p.height}
//                         placeholder="Height"
//                         placeholderTextColor="#9CA3AF"
//                         onChangeText={(v) =>
//                           setPeopleDetails(
//                             updateArrayItem(peopleDetails, i, { height: v }),
//                           )
//                         }
//                       />
//                     </View>
//                   </View>

//                   <View style={styles.row}>
//                     <View style={{ flex: 1, marginRight: 8 }}>
//                       <Text style={styles.label}>Weight</Text>
//                       <TextInput
//                         style={styles.input}
//                         value={p.weight}
//                         placeholder="Weight"
//                         placeholderTextColor="#9CA3AF"
//                         onChangeText={(v) =>
//                           setPeopleDetails(
//                             updateArrayItem(peopleDetails, i, { weight: v }),
//                           )
//                         }
//                       />
//                     </View>
//                     <View style={{ flex: 1 }}>
//                       <Text style={styles.label}>Marks</Text>
//                       <TextInput
//                         style={styles.input}
//                         value={p.marks}
//                         placeholder="Marks"
//                         placeholderTextColor="#9CA3AF"
//                         onChangeText={(v) =>
//                           setPeopleDetails(
//                             updateArrayItem(peopleDetails, i, { marks: v }),
//                           )
//                         }
//                       />
//                     </View>
//                   </View>
//                 </View>
//               ))}
//             </View>
//           )}

//           {/* 5. Vehicles Involved */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("vehicles")}
//           >
//             <View style={styles.cardHeader}>
//               <Car size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>No of Vehicles Involved</Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "vehicles" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>
//           {openSection === "vehicles" && (
//             <View style={styles.cardContent}>
//               <View style={styles.counterRow}>
//                 <TouchableOpacity onPress={() => changeCount("vehicles", -1)}>
//                   <Minus size={24} color="#64748b" />
//                 </TouchableOpacity>
//                 <Text style={styles.countText}>{vehiclesCount}</Text>
//                 <TouchableOpacity onPress={() => changeCount("vehicles", 1)}>
//                   <Plus size={24} color="#3b82f6" />
//                 </TouchableOpacity>
//               </View>

//               {vehicleDetails.map((v, i) => (
//                 <View key={i} style={styles.detailGroup}>
//                   <Text style={styles.subTitle}>Detail {i + 1}</Text>

//                   <Text style={styles.label}>Make</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={v.make}
//                     placeholder="Make"
//                     placeholderTextColor="#9CA3AF"
//                     onChangeText={(txt) =>
//                       setVehicleDetails(
//                         updateArrayItem(vehicleDetails, i, { make: txt }),
//                       )
//                     }
//                   />

//                   <Text style={styles.label}>Model</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={v.model}
//                     placeholder="Model"
//                     placeholderTextColor="#9CA3AF"
//                     onChangeText={(txt) =>
//                       setVehicleDetails(
//                         updateArrayItem(vehicleDetails, i, { model: txt }),
//                       )
//                     }
//                   />

//                   <Text style={styles.label}>Rego Number</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={v.rego}
//                     placeholder="Rego Number"
//                     placeholderTextColor="#9CA3AF"
//                     onChangeText={(txt) =>
//                       setVehicleDetails(
//                         updateArrayItem(vehicleDetails, i, { rego: txt }),
//                       )
//                     }
//                   />

//                   <Text style={styles.label}>Vehicle Type</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={v.vehicleType}
//                     placeholder="Vehicle Type"
//                     placeholderTextColor="#9CA3AF"
//                     onChangeText={(txt) =>
//                       setVehicleDetails(
//                         updateArrayItem(vehicleDetails, i, {
//                           vehicleType: txt,
//                         }),
//                       )
//                     }
//                   />
//                 </View>
//               ))}
//             </View>
//           )}

//           {/* 6. Emergency service Involved */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("emergency")}
//           >
//             <View style={styles.cardHeader}>
//               <Siren size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>Emergency Service Involved</Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "emergency" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>
//           {openSection === "emergency" && (
//             <View style={styles.cardContent}>
//               <View style={styles.chipContainer}>
//                 {emergencyTypes.map((item) => (
//                   <TouchableOpacity
//                     key={item.id}
//                     style={[
//                       styles.chip,
//                       selectedEmergencyId === item.id && styles.chipActive,
//                       { backgroundColor: item.background },
//                     ]}
//                     onPress={() => setSelectedEmergencyId(item.id)}
//                   >
//                     <Text style={[styles.chipText, { color: item.color }]}>
//                       {item.name}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>

//               <Text style={styles.label}>Emergency Details</Text>
//               <TextInput
//                 style={styles.input}
//                 value={emergencyDetail}
//                 onChangeText={setEmergencyDetail}
//               />

//               <Text style={styles.label}>Supervisor</Text>
//               <TextInput
//                 style={styles.input}
//                 value={supervisorName}
//                 onChangeText={setSupervisorName}
//               />

//               <Text style={styles.label}>Position</Text>
//               <TextInput
//                 style={styles.input}
//                 value={supervisorPosition}
//                 onChangeText={setSupervisorPosition}
//               />

//               <Text style={styles.label}>Address</Text>
//               <TextInput
//                 style={styles.input}
//                 value={supervisorAddress}
//                 onChangeText={setSupervisorAddress}
//               />

//               <Text style={styles.label}>Email</Text>
//               <TextInput
//                 style={styles.input}
//                 value={supervisorEmail}
//                 onChangeText={setSupervisorEmail}
//                 keyboardType="email-address"
//               />
//               {supervisorEmail && !isValidEmail(supervisorEmail) && (
//                 <Text style={styles.error}>Invalid email format</Text>
//               )}

//               <Text style={styles.label}>Phone</Text>
//               <TextInput
//                 style={styles.input}
//                 value={supervisorPhone}
//                 onChangeText={setSupervisorPhone}
//                 keyboardType="phone-pad"
//               />
//             </View>
//           )}

//           {/* 7. Witness Involved */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("witness")}
//           >
//             <View style={styles.cardHeader}>
//               <Eye size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>Witness Involved</Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "witness" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>
//           {openSection === "witness" && (
//             <View style={styles.cardContent}>
//               <View style={styles.counterRow}>
//                 <TouchableOpacity onPress={() => changeCount("witnesses", -1)}>
//                   <Minus size={24} color="#64748b" />
//                 </TouchableOpacity>
//                 <Text style={styles.countText}>{witnessesCount}</Text>
//                 <TouchableOpacity onPress={() => changeCount("witnesses", 1)}>
//                   <Plus size={24} color="#3b82f6" />
//                 </TouchableOpacity>
//               </View>

//               {witnessDetails.map((w, i) => (
//                 <View key={i} style={styles.detailGroup}>
//                   <Text style={styles.subTitle}>Detail {i + 1}</Text>

//                   <Text style={styles.label}>Full Name</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={w.name}
//                     onChangeText={(txt) =>
//                       setWitnessDetails(
//                         updateArrayItem(witnessDetails, i, { name: txt }),
//                       )
//                     }
//                   />

//                   <Text style={styles.label}>Email</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={w.email}
//                     onChangeText={(txt) =>
//                       setWitnessDetails(
//                         updateArrayItem(witnessDetails, i, { email: txt }),
//                       )
//                     }
//                     keyboardType="email-address"
//                   />
//                   {w.email && !isValidEmail(w.email) && (
//                     <Text style={styles.error}>Invalid email format</Text>
//                   )}

//                   <Text style={styles.label}>Address</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={w.address}
//                     onChangeText={(txt) =>
//                       setWitnessDetails(
//                         updateArrayItem(witnessDetails, i, { address: txt }),
//                       )
//                     }
//                   />

//                   <Text style={styles.label}>Phone</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={w.phone}
//                     onChangeText={(txt) =>
//                       setWitnessDetails(
//                         updateArrayItem(witnessDetails, i, { phone: txt }),
//                       )
//                     }
//                     keyboardType="phone-pad"
//                   />

//                   <Text style={styles.label}>Witness Detail</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={w.detail}
//                     onChangeText={(txt) =>
//                       setWitnessDetails(
//                         updateArrayItem(witnessDetails, i, { detail: txt }),
//                       )
//                     }
//                   />

//                   <Text style={styles.label}>More Info</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={w.moreInfo}
//                     onChangeText={(txt) =>
//                       setWitnessDetails(
//                         updateArrayItem(witnessDetails, i, { moreInfo: txt }),
//                       )
//                     }
//                   />
//                 </View>
//               ))}
//             </View>
//           )}

//           {/* 8. Photos of Incident */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("photos")}
//           >
//             <View style={styles.cardHeader}>
//               <UploadCloud size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>Photos of Incident</Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "photos" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>

//           {openSection === "photos" && (
//             <View style={styles.cardContent}>
//               <View style={styles.photoGrid}>
//                 {photos.map((photo, i) => (
//                   <View key={i} style={styles.photoItem}>
//                     <TouchableOpacity
//                       style={styles.removePhoto}
//                       onPress={() => removePhoto(i)}
//                     >
//                       <X size={18} color="#ef4444" />
//                     </TouchableOpacity>

//                     <Image
//                       source={{ uri: photo.uri }}
//                       style={styles.photo}
//                       resizeMode="cover"
//                     />

//                     <Text style={styles.timestamp}>{photo.timestamp}</Text>
//                   </View>
//                 ))}
//               </View>

//               <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
//                 <UploadCloud size={40} color="#eeeff0" />
//                 <Text style={{ marginTop: 8, color: "#eeeff0" }}>
//                   Click here to upload {photos.length}/6
//                 </Text>
//               </TouchableOpacity>

//               {photos.length >= 6 && (
//                 <Text
//                   style={{
//                     color: "#ef4444",
//                     fontSize: 13,
//                     textAlign: "center",
//                     marginTop: 8,
//                   }}
//                 >
//                   Maximum 6 photos reached
//                 </Text>
//               )}
//             </View>
//           )}

//           {/* For example, the signature section: */}
//           <TouchableOpacity
//             style={styles.sectionHeader}
//             onPress={() => toggleSection("signature")}
//           >
//             <View style={styles.cardHeader}>
//               <PenTool size={22} color="#3b82f6" />
//               <Text style={styles.cardTitle}>
//                 Add Staff Signature <Text style={styles.required}>*</Text>
//               </Text>
//               <ChevronDown
//                 size={20}
//                 color="#64748b"
//                 style={{
//                   transform: [
//                     { rotate: openSection === "signature" ? "180deg" : "0deg" },
//                   ],
//                 }}
//               />
//             </View>
//           </TouchableOpacity>
//           {openSection === "signature" && (
//             <View style={styles.cardContent}>
//               <View style={{ height: 300 }}>
//                 <SignatureScreen
//                   ref={signatureRef}
//                   onOK={(signature: string) => {
//                     // 1. Ensure you are getting the base64 string
//                     const base64Data = signature.replace(
//                       "data:image/png;base64,",
//                       "",
//                     );
//                     const finalUri = `data:image/png;base64,${base64Data}`;

//                     // 2. Update state
//                     setSignatureData(finalUri);

//                     Toast.show({
//                       type: "success",
//                       text1: "Signature Captured",
//                     });
//                   }}
//                   autoClear={false}
//                   androidLayerType="software"
//                   nestedScrollEnabled={true}
//                   webStyle={`
//                     .m-signature-pad--footer { display: none; }
//                     body,html { height:100%; }
//                   `}
//                 />
//               </View>
//               <View style={styles.signatureButtons}>
//                 <TouchableOpacity
//                   style={styles.clearBtn}
//                   onPress={handleClearSignature}
//                 >
//                   <Text style={styles.btnTextWhite}>Clear</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={styles.saveBtn}
//                   onPress={handleSaveSignature}
//                 >
//                   <Text style={styles.btnTextWhite}>Save</Text>
//                 </TouchableOpacity>
//               </View>

//               {/* {signatureData && (
//                 <Image source={{ uri: signatureData }} style={styles.signaturePreview} resizeMode="contain" />
//               )} */}
//             </View>
//           )}
//         </ScrollView>

//         {/* Bottom Action Buttons */}
//         <View style={styles.bottomButtons}>
//           <TouchableOpacity
//             style={styles.submitButton}
//             onPress={submitReport}
//             disabled={isSubmitting}
//           >
//             <Text style={styles.submitText}>Submit Incident</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.cancelButton}
//             onPress={() => navigation.goBack()}
//           >
//             <Text style={styles.cancelText}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// /* ==================== STYLES ==================== */
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//     paddingTop: Platform.OS === "android" ? 20 : 0,
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     padding: 20,
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: COLORS.text,
//   },

//   scrollContent: {
//     padding: 16,
//     paddingBottom: 160,
//   },

//   sectionHeader: {
//     backgroundColor: COLORS.card,
//     borderRadius: 16,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   cardHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 16,
//   },
//   cardTitle: {
//     flex: 1,
//     fontSize: 16,
//     fontWeight: "700",
//     marginLeft: 12,
//     color: COLORS.text,
//   },
//   cardContent: {
//     backgroundColor: COLORS.card,
//     padding: 16,
//     borderTopWidth: 1,
//     borderTopColor: COLORS.cardBorder,
//     borderBottomLeftRadius: 16,
//     borderBottomRightRadius: 16,
//   },

//   input: {
//     backgroundColor: COLORS.surface,
//     color: "#fff", // Added for dark mode readability
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     fontSize: 15,
//     marginBottom: 12,
//   },
//   readonly: {
//     backgroundColor: COLORS.background,
//     color: "#888", // Added for dark mode readability
//   },
//   textArea: {
//     minHeight: 100,
//     textAlignVertical: "top",
//     backgroundColor: COLORS.surface,
//     color: "#fff", // Added for dark mode readability
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     padding: 14,
//     fontSize: 15,
//   },

//   required: {
//     color: COLORS.danger,
//     fontWeight: "bold",
//   },

//   chipContainer: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 10,
//     marginBottom: 16,
//   },
//   chip: {
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//     alignItems: "center",
//     minWidth: 90,
//   },
//   chipActive: {
//     borderColor: COLORS.primary,
//     borderWidth: 2.5,
//   },
//   chipText: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: COLORS.text, // Added for dark mode readability
//   },

//   counterRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 40,
//     marginVertical: 12,
//   },
//   countText: {
//     fontSize: 28,
//     fontWeight: "700",
//     color: COLORS.text,
//   },

//   detailGroup: {
//     marginTop: 16,
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: COLORS.cardBorder,
//   },
//   subTitle: {
//     fontSize: 15,
//     fontWeight: "600",
//     color: COLORS.text,
//     marginBottom: 10,
//   },
//   label: {
//     fontSize: 14,
//     color: COLORS.textSecondary,
//     marginBottom: 6,
//     fontWeight: "500",
//   },
//   row: {
//     flexDirection: "row",
//     marginBottom: 12,
//   },
//   error: {
//     color: COLORS.danger,
//     fontSize: 13,
//     marginTop: -6,
//     marginBottom: 10,
//   },

//   aiButtons: {
//     flexDirection: "row",
//     gap: 12,
//     marginTop: 8,
//   },
//   spellBtn: {
//     flex: 1,
//     backgroundColor: COLORS.dangerBg,
//     paddingVertical: 12,
//     borderRadius: 10,
//     alignItems: "center",
//   },
//   aiBtn: {
//     flex: 1,
//     backgroundColor: COLORS.primaryGlow,
//     paddingVertical: 12,
//     borderRadius: 10,
//     alignItems: "center",
//   },
//   btnText: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: COLORS.primary,
//   },

//   photoGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 12,
//     marginBottom: 16,
//   },
//   photoItem: {
//     width: "30%",
//     position: "relative",
//   },
//   photo: {
//     width: "100%",
//     height: 85,
//     borderRadius: 12,
//     backgroundColor: COLORS.surface,
//     borderWidth: 1,
//     borderColor: COLORS.cardBorder,
//   },
//   removePhoto: {
//     position: "absolute",
//     top: -8,
//     right: -8,
//     backgroundColor: COLORS.danger, // Changed to fit dark theme
//     borderRadius: 12,
//     padding: 2,
//     zIndex: 10,
//   },
//   timestamp: {
//     fontSize: 7,
//     color: COLORS.warning,
//     textAlign: "center",
//     marginTop: -14,
//     fontWeight: "900",
//   },

//   uploadArea: {
//     alignItems: "center",
//     paddingVertical: 32,
//     borderWidth: 2,
//     borderColor: COLORS.cardBorder,
//     borderStyle: "dashed",
//     borderRadius: 12,
//   },

//   submittingOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "rgba(0,0,0,0.6)", // Darkened slightly for better overlay contrast
//     justifyContent: "center",
//     alignItems: "center",
//     zIndex: 9999,
//   },
//   submittingText: {
//     marginTop: 12,
//     color: COLORS.text,
//     fontWeight: "600",
//     fontSize: 16,
//   },

//   bottomButtons: {
//     paddingVertical: 16, // Added padding to separate buttons from edge
//     paddingHorizontal: 16,
//     backgroundColor: COLORS.background, // Ensure background matches
//     flexDirection: "row",
//     gap: 12,
//     borderTopWidth: 1, // Optional: add a subtle border to separate from body
//     borderColor: COLORS.cardBorder,
//   },
//   submitButton: {
//     flex: 1,
//     backgroundColor: COLORS.primary,
//     paddingVertical: 16,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   submitText: {
//     color: COLORS.text,
//     fontSize: 16,
//     fontWeight: "700",
//   },
//   cancelButton: {
//     flex: 1,
//     borderWidth: 1.5,
//     backgroundColor: "#5a1606",
//     borderColor: "#5a1606",
//     paddingVertical: 16,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   cancelText: {
//     color: COLORS.textMuted,
//     fontSize: 16,
//     fontWeight: "700",
//   },

//   signatureButtons: {
//     flexDirection: "row",
//     gap: 12,
//     marginTop: 12,
//   },
//   signaturePreview: {
//     width: "100%",
//     height: 120,
//     marginTop: 12,
//     borderRadius: 8,
//   },
//   btnTextWhite: {
//     color: COLORS.text,
//     fontWeight: "600",
//     fontSize: 15,
//   },

//   clearBtn: {
//     flex: 1,
//     backgroundColor: COLORS.danger,
//     paddingVertical: 14,
//     borderRadius: 10,
//     alignItems: "center",
//   },
//   saveBtn: {
//     flex: 1,
//     backgroundColor: COLORS.success,
//     paddingVertical: 14,
//     borderRadius: 10,
//     alignItems: "center",
//   },
// });

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  StatusBar,
} from "react-native";

import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  AlertCircle,
  FileText,
  Users,
  Car,
  Siren,
  Eye,
  UploadCloud,
  PenTool,
  X,
  Plus,
  Minus,
  Check,
  RotateCcw,
} from "lucide-react-native";

import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import SignatureScreen from "react-native-signature-canvas";
import { BASE_URL, getAuthToken } from "../services/authApi";
import RNFS from "react-native-fs";
import ImageResizer from "react-native-image-resizer";
import Toast from "react-native-toast-message";

interface InjuryType {
  id: number;
  name: string;
  color: string;
  background: string;
}
interface EmergencyType {
  id: number;
  name: string;
  color: string;
  background: string;
}
interface PersonDetail {
  name: string;
  email: string;
  phone: string;
  bodyType: string;
  gender: string;
  hair: string;
  height: string;
  weight: string;
  marks: string;
}
interface VehicleDetail {
  make: string;
  model: string;
  rego: string;
  vehicleType: string;
}
interface WitnessDetail {
  name: string;
  email: string;
  address: string;
  phone: string;
  detail: string;
  moreInfo: string;
}
interface PhotoItem {
  uri: string;
  timestamp: string;
}

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardBorder: "rgba(148,163,184,0.14)",
  cardBorderActive: "rgba(0,169,157,0.45)",
  primary: "#00A99D",
  primaryGlow: "rgba(0,169,157,0.16)",
  primaryBorder: "rgba(0,169,157,0.25)",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#54708F",
  success: "#34C88A",
  danger: "#F87171",
  dangerBg: "rgba(248,113,113,0.12)",
  warning: "#F5A623",
};

const SECTION_META: Record<string, { color: string; bg: string }> = {
  date: { color: "#3B82F6", bg: "rgba(59,130,246,0.16)" },
  type: { color: "#F87171", bg: "rgba(248,113,113,0.16)" },
  details: { color: "#A855F7", bg: "rgba(168,85,247,0.16)" },
  people: { color: "#22D3EE", bg: "rgba(34,211,238,0.16)" },
  vehicles: { color: "#FB923C", bg: "rgba(251,146,60,0.16)" },
  emergency: { color: "#EF4444", bg: "rgba(239,68,68,0.16)" },
  witness: { color: "#818CF8", bg: "rgba(129,140,248,0.16)" },
  photos: { color: "#F59E0B", bg: "rgba(245,158,11,0.16)" },
  signature: { color: "#00A99D", bg: "rgba(0,169,157,0.16)" },
};

export default function CreateIncidentReport({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { guardId, rosterId, siteId, siteName } = route.params ?? {};

  if (!siteId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorScreen}>
          <Text style={styles.errorText}>
            Missing required parameters (siteId is required)
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.errorBtn}
          >
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
const [openSection, setOpenSection] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const now = new Date();
  const incidentDateTimeDisplay = now.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()}`;
  const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const [selectedIncidentTypeId, setSelectedIncidentTypeId] = useState<
    number | null
  >(null);
  const [otherIncidentType, setOtherIncidentType] = useState("");
  const [incidentDetails, setIncidentDetails] = useState("");

  const [peopleCount, setPeopleCount] = useState(0);
  const [peopleDetails, setPeopleDetails] = useState<PersonDetail[]>([]);

  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetail[]>([]);

  const [selectedEmergencyId, setSelectedEmergencyId] = useState<number | null>(
    null,
  );
  const [emergencyDetail, setEmergencyDetail] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorPosition, setSupervisorPosition] = useState("");
  const [supervisorAddress, setSupervisorAddress] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");

  const [witnessesCount, setWitnessesCount] = useState(0);
  const [witnessDetails, setWitnessDetails] = useState<WitnessDetail[]>([]);

  const signatureRef = useRef<any>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSignatureModalVisible, setIsSignatureModalVisible] = useState(false);

  const injuryTypes: InjuryType[] = [
    { id: 5, name: "Forced Entry", color: "#F5C044", background: "#2A2410" },
    { id: 1, name: "Injury", color: "#F87171", background: "#2A1414" },
    { id: 2, name: "Trespassing", color: "#C084FC", background: "#221230" },
    { id: 3, name: "Refused Entry", color: "#60A5FA", background: "#10202E" },
    { id: 4, name: "Robbery", color: "#E5E7EB", background: "#1E1E1E" },
    { id: 6, name: "Others", color: "#E5E7EB", background: "#161616" },
  ];

  const emergencyTypes: EmergencyType[] = [
    { id: 1, name: "Police", background: "#10202E", color: "#60A5FA" },
    { id: 2, name: "Ambulance", background: "#2A1414", color: "#F87171" },
    { id: 3, name: "Fire Brigade", background: "#2A2410", color: "#F5C044" },
  ];

  const selectedIncidentName =
    injuryTypes.find((t) => t.id === selectedIncidentTypeId)?.name || "Others";

  const resizeForPreview = async (uri: string): Promise<string> => {
    try {
      const resized = await ImageResizer.createResizedImage(
        uri,
        800,
        800,
        "JPEG",
        60,
      );
      return resized.uri;
    } catch {
      return uri;
    }
  };

  const convertToBase64ForSubmit = async (uri: string): Promise<string> => {
    try {
      const resized = await ImageResizer.createResizedImage(
        uri,
        600,
        600,
        "JPEG",
        50,
      );
      const base64 = await RNFS.readFile(resized.uri, "base64");
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      throw new Error("Failed to process image");
    }
  };

  const isValidEmail = (email: string) =>
    !email || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const updateArrayItem = <T extends object>(
    arr: T[],
    index: number,
    updates: Partial<T>,
  ): T[] =>
    arr.map((item, i) => (i === index ? { ...item, ...updates } : item));

  const changeCount = (
    field: "people" | "vehicles" | "witnesses",
    delta: number,
  ) => {
    const max = 10;
    let count = 0;
    let setCount: any;
    let details: any[] = [];
    let setDetails: any;

    if (field === "people") {
      count = peopleCount;
      setCount = setPeopleCount;
      details = peopleDetails;
      setDetails = setPeopleDetails;
    } else if (field === "vehicles") {
      count = vehiclesCount;
      setCount = setVehiclesCount;
      details = vehicleDetails;
      setDetails = setVehicleDetails;
    } else {
      count = witnessesCount;
      setCount = setWitnessesCount;
      details = witnessDetails;
      setDetails = setWitnessDetails;
    }

    const next = Math.max(0, Math.min(max, count + delta));
    setCount(next);

    if (next > count) {
      let empty: any;
      if (field === "people")
        empty = {
          name: "",
          email: "",
          phone: "",
          bodyType: "",
          gender: "",
          hair: "",
          height: "",
          weight: "",
          marks: "",
        };
      else if (field === "vehicles")
        empty = { make: "", model: "", rego: "", vehicleType: "" };
      else
        empty = {
          name: "",
          email: "",
          address: "",
          phone: "",
          detail: "",
          moreInfo: "",
        };
      setDetails([...details, empty]);
    } else if (next < count) {
      setDetails(details.slice(0, -1));
    }
  };

  const pickImage = () => {
    const remainingSlots = 6 - photos.length;
    if (remainingSlots <= 0) {
      return Alert.alert("Limit Reached", "Maximum 6 photos allowed.");
    }

    Alert.alert("Add Photos", "Choose how you'd like to add your photos.", [
      {
        text: "Take Photo",
        onPress: () =>
          launchCamera(
            { mediaType: "photo", quality: 0.8 },
            handleMultipleImages,
          ),
      },
      {
        text: "Choose from Photos",
        onPress: () =>
          launchImageLibrary(
            {
              mediaType: "photo",
              quality: 0.8,
              selectionLimit: remainingSlots,
            } as any,
            handleMultipleImages,
          ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleMultipleImages = async (response: any) => {
    if (
      response.didCancel ||
      !response.assets ||
      response.assets.length === 0
    ) {
      return;
    }

    const newPhotos: PhotoItem[] = [];
    for (const asset of response.assets) {
      if (photos.length + newPhotos.length >= 6) break;
      try {
        const previewUri = await resizeForPreview(asset.uri);
        const timestamp = new Date().toLocaleString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        newPhotos.push({ uri: previewUri, timestamp });
      } catch (err) {
        console.warn("Failed to process image:", err);
      }
    }

    if (newPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotos]);
      Toast.show({
        type: "success",
        text1: `${newPhotos.length} photo(s) added successfully`,
        position: "bottom",
      });
    }
  };

  const removePhoto = (index: number) =>
    setPhotos(photos.filter((_, i) => i !== index));

  const handleSaveSignature = () => {
    signatureRef.current?.readSignature();
  };

  const handleClearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignatureData(null);
  };

  const onSignatureOK = (signature: string) => {
    if (!signature || signature.length < 100) {
      Toast.show({
        type: "error",
        text1: "Invalid Signature",
        text2: "Please draw your signature properly",
      });
      return;
    }
    const base64Data = signature.replace("data:image/png;base64,", "");
    setSignatureData(`data:image/png;base64,${base64Data}`);
    setIsSignatureModalVisible(false);
    Toast.show({
      type: "success",
      text1: "Signature Captured",
    });
  };

  const onSignatureEmpty = () => {
    Toast.show({
      type: "error",
      text1: "Empty Signature",
      text2: "Please draw your signature",
    });
  };

  const submitReport = async () => {
    if (!selectedIncidentTypeId)
      return Alert.alert("Required", "Incident Type is required");
    if (!incidentDetails.trim())
      return Alert.alert("Required", "Incident Details are required");
    if (!signatureData)
      return Alert.alert("Required", "Staff signature is required");

    setIsSubmitting(true);

    requestAnimationFrame(() => {
      setTimeout(async () => {
        try {
          const token = await getAuthToken();
          if (!token) throw new Error("No authentication token found");

          const photoPayload = [];
          for (const photo of photos) {
            const base64 = await convertToBase64ForSubmit(photo.uri);
            photoPayload.push({ imgPath: base64, timestamp: photo.timestamp });
          }

          const payload = {
            guard_id: guardId,
            roster_id: rosterId,
            date: formattedDate,
            time: formattedTime,
            site_name: siteName || "Unknown Site",
            injury_type: selectedIncidentName,
            incident_detail: incidentDetails.trim(),
            people_involved: peopleDetails.map((p) => ({
              name: p.name || "",
              phone: p.phone || "",
              bodyType: p.bodyType || "",
              gender: p.gender || "",
              hair: p.hair || "",
              height: p.height || "",
              weight: p.weight || "",
              marks: p.marks || "",
              email: p.email || "",
            })),
            vehicle: vehicleDetails.map((v) => ({
              make: v.make || "",
              model: v.model || "",
              vehicle_type: v.vehicleType || "",
              vehicle_rander: v.rego || "",
            })),
            emergency_services: {
              emergency_type: selectedEmergencyId
                ? emergencyTypes.find((e) => e.id === selectedEmergencyId)
                    ?.name || ""
                : "",
              emergency_detail: emergencyDetail || "",
              supervisor_name: supervisorName || "",
              position: supervisorPosition || "",
              address: supervisorAddress || "",
              email: supervisorEmail || "",
              phone: supervisorPhone || "",
            },
            wittness: witnessDetails.map((w) => ({
              wittness_detail: w.detail || "",
              wittness_name: w.name || "",
              wittness_address: w.address || "",
              wittness_email: w.email || "",
              wittness_phone: w.phone || "",
              witness_more_info: w.moreInfo || "",
            })),
            photo: photoPayload,
            signature: signatureData,
          };

          const response = await fetch(
            `${BASE_URL}/report-incident/${siteId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
            },
          );

          const responseData = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              responseData.message || `Server error: ${response.status}`,
            );
          }

          Alert.alert("Success", "Incident report submitted successfully!", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        } catch (error: any) {
          console.error("Submit error:", error);
          Alert.alert(
            "Submission Failed",
            error.message || "Failed to submit report. Please try again.",
          );
        } finally {
          setIsSubmitting(false);
        }
      }, 100);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <ChevronLeft size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>Incident Report</Text>
            <Text style={styles.headerSubtitle}>
              {siteName || "Unknown Site"}
            </Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {isSubmitting && (
            <View style={styles.submittingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.submittingText}>Submitting Report...</Text>
            </View>
          )}

          {/* 1. Date/Time */}
          <SectionCard
            icon={<Calendar size={20} color={SECTION_META.date.color} />}
            iconBg={SECTION_META.date.bg}
            label="Incident Date/Time"
            isOpen={openSection === "date"}
            onPress={() => toggleSection("date")}
          />
          {openSection === "date" && (
            <View style={styles.cardContent}>
              <TextInput
                style={[styles.input, styles.readonly]}
                value={incidentDateTimeDisplay}
                editable={false}
              />
            </View>
          )}

          {/* 2. Incident Type */}
          <SectionCard
            icon={<AlertCircle size={20} color={SECTION_META.type.color} />}
            iconBg={SECTION_META.type.bg}
            label="Incident Type"
            required
            preview={selectedIncidentTypeId ? selectedIncidentName : undefined}
            isOpen={openSection === "type"}
            onPress={() => toggleSection("type")}
          />
          {openSection === "type" && (
            <View style={styles.cardContent}>
              <View style={styles.chipContainer}>
                {injuryTypes.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.chip,
                      selectedIncidentTypeId === item.id && styles.chipActive,
                      { backgroundColor: item.background },
                    ]}
                    onPress={() => {
                      setSelectedIncidentTypeId(item.id);
                      if (item.id !== 6) setOtherIncidentType("");
                    }}
                  >
                    <Text style={[styles.chipText, { color: item.color }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedIncidentTypeId === 6 && (
                <TextInput
                  style={styles.input}
                  placeholder="Please specify the other incident type..."
                  placeholderTextColor={COLORS.textMuted}
                  value={otherIncidentType}
                  onChangeText={setOtherIncidentType}
                  multiline
                />
              )}
            </View>
          )}

          {/* 3. Details */}
          <SectionCard
            icon={<FileText size={20} color={SECTION_META.details.color} />}
            iconBg={SECTION_META.details.bg}
            label="Incident Details"
            required
            isOpen={openSection === "details"}
            onPress={() => toggleSection("details")}
          />
          {openSection === "details" && (
            <View style={styles.cardContent}>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="Enter details here..."
                placeholderTextColor={COLORS.textMuted}
                value={incidentDetails}
                onChangeText={setIncidentDetails}
              />
            </View>
          )}

          {/* 4. People Involved */}
          <SectionCard
            icon={<Users size={20} color={SECTION_META.people.color} />}
            iconBg={SECTION_META.people.bg}
            label="People Involved"
            preview={peopleCount > 0 ? `${peopleCount} added` : undefined}
            isOpen={openSection === "people"}
            onPress={() => toggleSection("people")}
          />
          {openSection === "people" && (
            <View style={styles.cardContent}>
              <Counter
                value={peopleCount}
                onDecrement={() => changeCount("people", -1)}
                onIncrement={() => changeCount("people", 1)}
              />

              {peopleDetails.map((p, i) => (
                <View key={i} style={styles.detailGroup}>
                  <Text style={styles.subTitle}>Person {i + 1}</Text>

                  <Field
                    label="Full Name"
                    value={p.name}
                    placeholder="Person Name"
                    onChangeText={(v) =>
                      setPeopleDetails(
                        updateArrayItem(peopleDetails, i, { name: v }),
                      )
                    }
                  />
                  <Field
                    label="Email"
                    value={p.email}
                    placeholder="Person Email"
                    keyboardType="email-address"
                    onChangeText={(v) =>
                      setPeopleDetails(
                        updateArrayItem(peopleDetails, i, { email: v }),
                      )
                    }
                  />
                  {p.email && !isValidEmail(p.email) && (
                    <Text style={styles.error}>Invalid email format</Text>
                  )}
                  <Field
                    label="Phone"
                    value={p.phone}
                    placeholder="Person Phone"
                    keyboardType="phone-pad"
                    onChangeText={(v) =>
                      setPeopleDetails(
                        updateArrayItem(peopleDetails, i, { phone: v }),
                      )
                    }
                  />

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field
                        label="Body Type"
                        value={p.bodyType}
                        placeholder="Body Type"
                        onChangeText={(v) =>
                          setPeopleDetails(
                            updateArrayItem(peopleDetails, i, { bodyType: v }),
                          )
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Gender"
                        value={p.gender}
                        placeholder="Gender"
                        onChangeText={(v) =>
                          setPeopleDetails(
                            updateArrayItem(peopleDetails, i, { gender: v }),
                          )
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field
                        label="Hair Color"
                        value={p.hair}
                        placeholder="Hair Color"
                        onChangeText={(v) =>
                          setPeopleDetails(
                            updateArrayItem(peopleDetails, i, { hair: v }),
                          )
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Height"
                        value={p.height}
                        placeholder="Height"
                        onChangeText={(v) =>
                          setPeopleDetails(
                            updateArrayItem(peopleDetails, i, { height: v }),
                          )
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Field
                        label="Weight"
                        value={p.weight}
                        placeholder="Weight"
                        onChangeText={(v) =>
                          setPeopleDetails(
                            updateArrayItem(peopleDetails, i, { weight: v }),
                          )
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Marks"
                        value={p.marks}
                        placeholder="Marks"
                        onChangeText={(v) =>
                          setPeopleDetails(
                            updateArrayItem(peopleDetails, i, { marks: v }),
                          )
                        }
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 5. Vehicles */}
          <SectionCard
            icon={<Car size={20} color={SECTION_META.vehicles.color} />}
            iconBg={SECTION_META.vehicles.bg}
            label="Vehicles Involved"
            preview={vehiclesCount > 0 ? `${vehiclesCount} added` : undefined}
            isOpen={openSection === "vehicles"}
            onPress={() => toggleSection("vehicles")}
          />
          {openSection === "vehicles" && (
            <View style={styles.cardContent}>
              <Counter
                value={vehiclesCount}
                onDecrement={() => changeCount("vehicles", -1)}
                onIncrement={() => changeCount("vehicles", 1)}
              />

              {vehicleDetails.map((v, i) => (
                <View key={i} style={styles.detailGroup}>
                  <Text style={styles.subTitle}>Vehicle {i + 1}</Text>
                  <Field
                    label="Make"
                    value={v.make}
                    placeholder="Make"
                    onChangeText={(txt) =>
                      setVehicleDetails(
                        updateArrayItem(vehicleDetails, i, { make: txt }),
                      )
                    }
                  />
                  <Field
                    label="Model"
                    value={v.model}
                    placeholder="Model"
                    onChangeText={(txt) =>
                      setVehicleDetails(
                        updateArrayItem(vehicleDetails, i, { model: txt }),
                      )
                    }
                  />
                  <Field
                    label="Rego Number"
                    value={v.rego}
                    placeholder="Rego Number"
                    onChangeText={(txt) =>
                      setVehicleDetails(
                        updateArrayItem(vehicleDetails, i, { rego: txt }),
                      )
                    }
                  />
                  <Field
                    label="Vehicle Type"
                    value={v.vehicleType}
                    placeholder="Vehicle Type"
                    onChangeText={(txt) =>
                      setVehicleDetails(
                        updateArrayItem(vehicleDetails, i, {
                          vehicleType: txt,
                        }),
                      )
                    }
                  />
                </View>
              ))}
            </View>
          )}

          {/* 6. Emergency Services */}
          <SectionCard
            icon={<Siren size={20} color={SECTION_META.emergency.color} />}
            iconBg={SECTION_META.emergency.bg}
            label="Emergency Service Involved"
            isOpen={openSection === "emergency"}
            onPress={() => toggleSection("emergency")}
          />
          {openSection === "emergency" && (
            <View style={styles.cardContent}>
              <View style={styles.chipContainer}>
                {emergencyTypes.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.chip,
                      selectedEmergencyId === item.id && styles.chipActive,
                      { backgroundColor: item.background },
                    ]}
                    onPress={() => setSelectedEmergencyId(item.id)}
                  >
                    <Text style={[styles.chipText, { color: item.color }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Field
                label="Emergency Details"
                value={emergencyDetail}
                onChangeText={setEmergencyDetail}
              />
              <Field
                label="Supervisor"
                value={supervisorName}
                onChangeText={setSupervisorName}
              />
              <Field
                label="Position"
                value={supervisorPosition}
                onChangeText={setSupervisorPosition}
              />
              <Field
                label="Address"
                value={supervisorAddress}
                onChangeText={setSupervisorAddress}
              />
              <Field
                label="Email"
                value={supervisorEmail}
                onChangeText={setSupervisorEmail}
                keyboardType="email-address"
              />
              {supervisorEmail && !isValidEmail(supervisorEmail) && (
                <Text style={styles.error}>Invalid email format</Text>
              )}
              <Field
                label="Phone"
                value={supervisorPhone}
                onChangeText={setSupervisorPhone}
                keyboardType="phone-pad"
              />
            </View>
          )}

          {/* 7. Witnesses */}
          <SectionCard
            icon={<Eye size={20} color={SECTION_META.witness.color} />}
            iconBg={SECTION_META.witness.bg}
            label="Witness Involved"
            preview={witnessesCount > 0 ? `${witnessesCount} added` : undefined}
            isOpen={openSection === "witness"}
            onPress={() => toggleSection("witness")}
          />
          {openSection === "witness" && (
            <View style={styles.cardContent}>
              <Counter
                value={witnessesCount}
                onDecrement={() => changeCount("witnesses", -1)}
                onIncrement={() => changeCount("witnesses", 1)}
              />

              {witnessDetails.map((w, i) => (
                <View key={i} style={styles.detailGroup}>
                  <Text style={styles.subTitle}>Witness {i + 1}</Text>
                  <Field
                    label="Full Name"
                    value={w.name}
                    onChangeText={(txt) =>
                      setWitnessDetails(
                        updateArrayItem(witnessDetails, i, { name: txt }),
                      )
                    }
                  />
                  <Field
                    label="Email"
                    value={w.email}
                    keyboardType="email-address"
                    onChangeText={(txt) =>
                      setWitnessDetails(
                        updateArrayItem(witnessDetails, i, { email: txt }),
                      )
                    }
                  />
                  {w.email && !isValidEmail(w.email) && (
                    <Text style={styles.error}>Invalid email format</Text>
                  )}
                  <Field
                    label="Address"
                    value={w.address}
                    onChangeText={(txt) =>
                      setWitnessDetails(
                        updateArrayItem(witnessDetails, i, { address: txt }),
                      )
                    }
                  />
                  <Field
                    label="Phone"
                    value={w.phone}
                    keyboardType="phone-pad"
                    onChangeText={(txt) =>
                      setWitnessDetails(
                        updateArrayItem(witnessDetails, i, { phone: txt }),
                      )
                    }
                  />
                  <Field
                    label="Witness Detail"
                    value={w.detail}
                    onChangeText={(txt) =>
                      setWitnessDetails(
                        updateArrayItem(witnessDetails, i, { detail: txt }),
                      )
                    }
                  />
                  <Field
                    label="More Info"
                    value={w.moreInfo}
                    onChangeText={(txt) =>
                      setWitnessDetails(
                        updateArrayItem(witnessDetails, i, { moreInfo: txt }),
                      )
                    }
                  />
                </View>
              ))}
            </View>
          )}

          {/* 8. Photos */}
          <SectionCard
            icon={<UploadCloud size={20} color={SECTION_META.photos.color} />}
            iconBg={SECTION_META.photos.bg}
            label="Photos of Incident"
            preview={`${photos.length}/6 added`}
            isOpen={openSection === "photos"}
            onPress={() => toggleSection("photos")}
          />
          {openSection === "photos" && (
            <View style={styles.cardContent}>
              {photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {photos.map((photo, i) => (
                    <View key={i} style={styles.photoItem}>
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => removePhoto(i)}
                        hitSlop={6}
                      >
                        <X size={16} color="#fff" />
                      </TouchableOpacity>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                      <Text style={styles.timestamp}>{photo.timestamp}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
                <UploadCloud size={32} color={COLORS.textSecondary} />
                <Text style={styles.uploadText}>
                  Tap to add photos ({photos.length}/6)
                </Text>
              </TouchableOpacity>

              {photos.length >= 6 && (
                <Text style={styles.limitText}>Maximum 6 photos reached</Text>
              )}
            </View>
          )}

          {/* 9. Signature */}
          <SectionCard
            icon={<PenTool size={20} color={SECTION_META.signature.color} />}
            iconBg={SECTION_META.signature.bg}
            label="Staff Signature"
            required
            badge={
              signatureData ? (
                <View style={styles.doneBadge}>
                  <Check size={12} color={COLORS.success} />
                  <Text style={styles.doneBadgeText}>Signed</Text>
                </View>
              ) : null
            }
            isOpen={openSection === "signature"}
            onPress={() => toggleSection("signature")}
          />
          {openSection === "signature" && (
            <View style={styles.cardContent}>
              {signatureData ? (
                <View style={styles.signaturePreviewWrapper}>
                  <Image
                    source={{ uri: signatureData }}
                    style={styles.signaturePreviewImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.reSignBtn}
                    onPress={() => setIsSignatureModalVisible(true)}
                  >
                    <RotateCcw size={16} color={COLORS.primary} />
                    <Text style={styles.reSignBtnText}>Redraw Signature</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.openSignatureBtn}
                  onPress={() => setIsSignatureModalVisible(true)}
                >
                  <PenTool size={20} color={COLORS.primary} />
                  <Text style={styles.openSignatureBtnText}>
                    Tap to sign signature pad
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* --- SIGNATURE MODAL --- */}
        <Modal
          visible={isSignatureModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsSignatureModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <StatusBar
              barStyle="light-content"
              backgroundColor={COLORS.background}
            />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Draw Staff Signature</Text>
              <TouchableOpacity
                onPress={() => setIsSignatureModalVisible(false)}
                hitSlop={10}
              >
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalPadContainer}>
              <SignatureScreen
                ref={signatureRef}
                onOK={onSignatureOK}
                onEmpty={onSignatureEmpty}
                autoClear={false}
                descriptionText=""
                clearText="Clear"
                confirmText="Save"
                webStyle={`
                  html, body {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    background-color: #ffffff;
                  }
                  .m-signature-pad {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    border: none;
                    box-shadow: none;
                  }
                  .m-signature-pad--body {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    border: none;
                  }
                  .m-signature-pad--footer {
                    display: none !important;
                  }
                `}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearSignature}
              >
                <Text style={styles.btnTextWhite}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveSignature}
              >
                <Check size={18} color="#fff" />
                <Text style={styles.btnTextWhite}>Save Signature</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
            onPress={submitReport}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit Incident</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Reusable pieces ---
function SectionCard({
  icon,
  iconBg,
  label,
  required,
  preview,
  badge,
  isOpen,
  onPress,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  required?: boolean;
  preview?: string;
  badge?: React.ReactNode;
  isOpen: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.sectionHeader, isOpen && styles.sectionHeaderActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {label} {required && <Text style={styles.required}>*</Text>}
          </Text>
          {preview && <Text style={styles.cardPreview}>{preview}</Text>}
          {badge}
        </View>
        <ChevronDown
          size={18}
          color={COLORS.textSecondary}
          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
        />
      </View>
    </TouchableOpacity>
  );
}

function Counter({
  value,
  onDecrement,
  onIncrement,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.counterRow}>
      <TouchableOpacity
        style={styles.counterBtn}
        onPress={onDecrement}
        hitSlop={8}
      >
        <Minus size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.countText}>{value}</Text>
      <TouchableOpacity
        style={styles.counterBtn}
        onPress={onIncrement}
        hitSlop={8}
      >
        <Plus size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: "center",
    lineHeight: 22,
  },
  errorBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  errorBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  scrollContent: { padding: 16, paddingBottom: 160 },

  sectionHeader: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionHeaderActive: { borderColor: COLORS.cardBorderActive },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardTitle: { fontSize: 14.5, fontWeight: "600", color: COLORS.text },
  cardPreview: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  doneBadgeText: { fontSize: 12, color: COLORS.success, fontWeight: "600" },

  cardContent: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    marginTop: -6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  input: {
    backgroundColor: COLORS.surface,
    color: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  readonly: { backgroundColor: COLORS.background, color: COLORS.textMuted },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
    backgroundColor: COLORS.surface,
    color: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    fontSize: 15,
  },

  required: { color: COLORS.danger, fontWeight: "bold" },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    minWidth: 90,
  },
  chipActive: { borderColor: COLORS.primary, borderWidth: 2 },
  chipText: { fontSize: 13, fontWeight: "600" },

  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    marginVertical: 8,
    marginBottom: 16,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  countText: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    minWidth: 30,
    textAlign: "center",
  },

  detailGroup: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  subTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "500",
  },
  row: { flexDirection: "row", marginBottom: 12 },
  error: {
    color: COLORS.danger,
    fontSize: 12.5,
    marginTop: -6,
    marginBottom: 10,
  },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  photoItem: { width: "30%", position: "relative" },
  photo: {
    width: "100%",
    height: 85,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  removePhoto: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
  },
  timestamp: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },

  uploadArea: {
    alignItems: "center",
    paddingVertical: 28,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  uploadText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
    fontSize: 13,
  },
  limitText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },

  openSignatureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primaryGlow,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
  },
  openSignatureBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  signaturePreviewWrapper: {
    alignItems: "center",
  },
  signaturePreviewImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  reSignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 4,
  },
  reSignBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  modalPadContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },

  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  submittingText: {
    marginTop: 12,
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 16,
  },

  bottomButtons: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  submitButton: {
    flex: 1.4,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: "700" },

  btnTextWhite: { color: "#fff", fontWeight: "600", fontSize: 14.5 },
  clearBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
