
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  FileText,
  Camera,
  PenTool,
  X,
  UploadCloud,
  Check,
  RotateCcw,
} from "lucide-react-native";
import {
  launchCamera,
  CameraOptions,
  ImagePickerResponse,
} from "react-native-image-picker";
import SignatureScreen from "react-native-signature-canvas";
import RNFS from "react-native-fs";
import ImageResizer from "react-native-image-resizer";
import { BASE_URL, getAuthToken } from "../services/authApi";
import Toast from "react-native-toast-message";

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
  warningBg: "rgba(245,166,35,0.08)",
};

const SECTION_META = {
  date: { color: "#3B82F6", bg: "rgba(59,130,246,0.16)" },
  details: { color: "#A855F7", bg: "rgba(168,85,247,0.16)" },
  photos: { color: "#F59E0B", bg: "rgba(245,158,11,0.16)" },
  signature: { color: "#00A99D", bg: "rgba(0,169,157,0.16)" },
};

export default function CreateFootPatrol({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  let siteId: string | number;
  let siteName: string;
  let guardId: string | number;
  let rosterId: string | number;

  if (route.params?.jobRoster) {
    const job = route.params.jobRoster;
    siteId = job?.site?.id;
    siteName = job?.site?.site_name || "Unknown Site";
    guardId = job?.guard_id;
    rosterId = job?.id;
  } else {
    siteId = route.params?.siteId;
    siteName = route.params?.siteName || "Unknown Site";
    guardId = route.params?.guardId;
    rosterId = route.params?.rosterId;
  }

  if (!siteId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorScreen}>
          <Text style={styles.errorText}>
            Missing required site or roster information.{"\n"}Go back and try
            again.
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

  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()}`;
  const formattedTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const [expanded, setExpanded] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSignatureModalVisible, setIsSignatureModalVisible] = useState(false);
  const [patrollingDetails, setPatrollingDetails] = useState<string>("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signatureRef = useRef<any>(null);

  const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };

  const resizeForPreview = async (uri: string): Promise<string> => {
    try {
      const resized = await ImageResizer.createResizedImage(
        uri,
        800,
        800,
        "JPEG",
        60,
        0,
        undefined,
        false,
        { mode: "cover" },
      );
      return resized.uri;
    } catch (e) {
      console.error("[Preview Resize] Failed:", e);
      return uri;
    }
  };

  const convertToBase64ForSubmit = async (uri: string): Promise<string> => {
    try {
      const resized = await ImageResizer.createResizedImage(
        uri,
        1000,
        1000,
        "JPEG",
        70,
        0,
      );
      const base64Content = await RNFS.readFile(resized.uri, "base64");
      return `data:image/jpeg;base64,${base64Content}`;
    } catch (error) {
      console.error("[Base64 Conversion] Failed:", error);
      throw new Error("Failed to convert photo to base64");
    }
  };

  const pickImage = () => {
    if (photos.length >= 6) {
      Alert.alert("Limit reached", "You can upload up to 6 photos.");
      return;
    }

    const options: CameraOptions = {
      mediaType: "photo",
      quality: 0.7,
      includeBase64: false,
    };

    Alert.alert("Add Photo", "Take a photo to continue.", [
      { text: "Take Photo", onPress: () => launchCamera(options, handleImage) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleImage = async (response: ImagePickerResponse) => {
    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert("Error", response.errorMessage || "Failed to pick image");
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.uri) return;

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

      setPhotos((prev) => [...prev, { uri: previewUri, timestamp }]);
    } catch (err: any) {
      console.error("[handleImage] Processing failed:", err);
      Alert.alert("Error", "Failed to process image. Please try again.");
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // --- Signature handlers ---
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
    setSignatureData(signature);
    setIsSignatureModalVisible(false);
    Toast.show({
      type: "success",
      text1: "Signature Saved",
      text2: "Your signature has been captured successfully",
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
    if (!patrollingDetails.trim()) {
      return Alert.alert("Required", "Please enter patrolling details.");
    }
    if (!signatureData) {
      return Alert.alert("Required", "Please provide staff signature.");
    }

    setIsSubmitting(true);

    try {
      const photoPayload = await Promise.all(
        photos.map(async (photo, index) => {
          try {
            const base64Uri = await convertToBase64ForSubmit(photo.uri);
            return { imgPath: base64Uri, timestamp: photo.timestamp };
          } catch (err) {
            console.error(`Failed to process photo ${index + 1}`, err);
            throw err;
          }
        }),
      );

      const payload = {
        guard_id: guardId,
        roster_id: rosterId,
        date: formattedDate,
        time: formattedTime,
        site_name: siteName,
        patrolling_detail: patrollingDetails.trim(),
        photo: JSON.stringify(photoPayload),
        signature: signatureData,
      };

      const token = await getAuthToken();
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(
        `${BASE_URL}/add-foot-patrol-report/${siteId}`,
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

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        Alert.alert(
          "Success",
          "Foot Patrolling Report submitted successfully!",
        );
        navigation.goBack();
      } else {
        const msg = result.message || `Server error (${response.status})`;
        Alert.alert("Submission Failed", msg);
      }
    } catch (error: any) {
      console.error("Submit failed:", error);
      Alert.alert(
        "Failed",
        error.message || "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeft size={26} color="#fff" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Foot Patrolling Report</Text>
          <Text style={styles.headerSubtitle}>{siteName}</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date/Time */}
        <SectionCard
          icon={<Calendar size={20} color={SECTION_META.date.color} />}
          iconBg={SECTION_META.date.bg}
          label="Patrolling Date/Time"
          isOpen={expanded === "date"}
          onPress={() => toggleSection("date")}
        />
        {expanded === "date" && (
          <View style={styles.expandedContent}>
            <Text style={styles.fieldValueText}>
              {formattedDate} · {formattedTime}
            </Text>
          </View>
        )}

        {/* Details */}
        <SectionCard
          icon={<FileText size={20} color={SECTION_META.details.color} />}
          iconBg={SECTION_META.details.bg}
          label="Foot Patrolling Details"
          required
          preview={patrollingDetails || "Tap to write"}
          isOpen={expanded === "details"}
          onPress={() => toggleSection("details")}
        />
        {expanded === "details" && (
          <View style={styles.expandedContent}>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Describe what you observed during the patrol..."
              placeholderTextColor={COLORS.textMuted}
              value={patrollingDetails}
              onChangeText={setPatrollingDetails}
            />
          </View>
        )}

        {/* Photos */}
        <SectionCard
          icon={<Camera size={20} color={SECTION_META.photos.color} />}
          iconBg={SECTION_META.photos.bg}
          label="Photos"
          preview={`${photos.length} added`}
          isOpen={expanded === "photos"}
          onPress={() => toggleSection("photos")}
        />
        {expanded === "photos" && (
          <View style={styles.expandedContent}>
            {photos.length > 0 && (
              <View style={styles.photoGrid}>
                {photos.map((photo, i) => (
                  <View key={i} style={styles.photoItem}>
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
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
                Tap to add a photo ({photos.length}/6)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Signature */}
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
          isOpen={expanded === "signature"}
          onPress={() => toggleSection("signature")}
        />
        {expanded === "signature" && (
          <View style={styles.expandedContent}>
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
            <Text style={styles.submitText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
      style={[styles.fieldCard, isOpen && styles.fieldCardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        {preview !== undefined && (
          <Text
            style={
              preview === "Tap to write"
                ? styles.fieldValuePlaceholder
                : styles.fieldValue
            }
            numberOfLines={1}
          >
            {preview}
          </Text>
        )}
        {badge}
      </View>
      <ChevronDown
        size={18}
        color={COLORS.textSecondary}
        style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorBtnText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  fieldCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  fieldCardActive: {
    borderColor: COLORS.cardBorderActive,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  fieldValue: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  fieldValuePlaceholder: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  required: {
    color: COLORS.danger,
  },
  expandedContent: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  fieldValueText: {
    color: COLORS.text,
    fontSize: 15,
  },
  textArea: {
    color: COLORS.text,
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: "top",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  photoItem: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
  },
  timestamp: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  uploadArea: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryGlow,
  },
  uploadText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  doneBadgeText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "600",
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
  clearBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
