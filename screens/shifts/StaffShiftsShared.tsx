import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  ScrollView,
  Platform,
} from "react-native";
import {
  ChevronDown,
  UserCheck,
  CheckCircle,
  XCircle,
  Briefcase,
  ThumbsUp,
} from "lucide-react-native";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
} from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";

// ─── Design System ─────────────────────────────────────────────────────────────
export const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardBorder: "rgba(98, 97, 97, 0.83)",
  primary: "#00A99D",
  primaryGlow: "rgba(0,169,157,0.25)",
  primaryBorder: "rgba(0,169,157,0.25)",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#4A6080",
  success: "#34C88A",
  danger: "#F87171",
  dangerBg: "rgba(248,88,88,0.12)",
  warning: "#F5A623",
  warningBg: "rgba(245,166,35,0.08)",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

export const PENDING_NOTIF_KEY = "@pending_asap_notification";

export type AvailableJob = {
  id: number;
  title: string;
  siteName: string;
  location: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  rate: string;
  status?: string;
  raw: any;
};

export type Props = { navigation: any; route: any };

export const formatDate = (val: any): string => {
  if (!val) return "—";
  const clean = String(val).split("T")[0].split(" ")[0];
  const parts = clean.includes("-") ? clean.split("-") : clean.split("/");
  if (parts.length !== 3) return "—";
  let [y, m, d] = parts;
  if (y.length === 4) return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  return `${y.padStart(2, "0")}/${m.padStart(2, "0")}/${d}`;
};

export const formatTime = (val: any): string => {
  if (!val) return "—";
  const str = String(val).trim();
  const parts = str.split(" ");
  const time = parts[1] || parts[0];
  if (time && time.includes(":")) return time.slice(0, 5);
  return "—";
};

export const capitalizeName = (name: string = ""): string =>
  name
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
};

export const shapeJobForDetails = (raw: any) => {
  if (raw?.start && raw?.end) return raw;
  const roster = raw?.roster?.roster || raw?.roster || raw || {};
  if (roster?.start && roster?.end) return roster;
  return {
    id: raw?.id,
    start: raw?.start_time || raw?.start || null,
    end: raw?.end_time || raw?.end || null,
    hours: raw?.total_hours || raw?.hours || null,
    site: {
      site_name: raw?.site_name || raw?.site?.site_name || "N/A",
      address: raw?.site_address || raw?.address || raw?.site?.address || "N/A",
      coordinates: raw?.coordinates || raw?.site?.coordinates || null,
    },
  };
};

export const getNotifKey = (job: any): string => {
  if (!job) return "";
  try {
    const id =
      job?.id ??
      job?.additionalData?.roster?.roster?.id ??
      job?.additionalData?.roster?.id ??
      job?.roster?.roster?.id ??
      job?.roster?.id ??
      null;
    const dist = job?.additionalData?.roster?.distance ?? job?.distance ?? "";
    if (id !== null && id !== undefined) return `id:${id}:${dist}`;
    return JSON.stringify(job);
  } catch {
    return String(Date.now());
  }
};

export const parseDocumentList = (docList: any): string[] => {
  if (!docList) return [];
  if (Array.isArray(docList)) return docList;
  try {
    const parsed = JSON.parse(docList);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const extractJobData = (notif: any): any => {
  if (!notif) return {};
  if (notif?.id && (notif.start_time || notif.start || notif.end_time)) {
    return notif;
  }
  if (notif?.additionalData?.roster?.roster?.id)
    return notif.additionalData.roster.roster;
  if (notif?.additionalData?.roster?.id) return notif.additionalData.roster;
  if (notif?.roster?.roster?.id) return notif.roster.roster;
  if (notif?.roster?.id) return notif.roster;
  const deepSearch = (obj: any, depth = 0): any => {
    if (!obj || typeof obj !== "object" || depth > 6) return null;
    if (
      obj.id &&
      (obj.site_name || obj.site_address || obj.start_time || obj.start)
    ) {
      return obj;
    }
    for (const key in obj) {
      const found = deepSearch(obj[key], depth + 1);
      if (found) return found;
    }
    return null;
  };
  const found = deepSearch(notif);
  if (found) return found;
  return notif;
};
export const JOBS_PAGE_SIZE = 50;

export interface StaffAssignSheetProps {
  visible: boolean;
  job: AvailableJob | null;
  staffList: any[];
  loadingStaff: boolean;
  selectedStaff: number | null;
  onSelectStaff: (id: number) => void;
  onAccept: () => void;
  onDecline: () => void;
  submitting?: boolean;
  showStaffSection?: boolean;
  staffSelectionRequired?: boolean;
  description?: string;
  requiredDocuments?: string[];
}

export const StaffAssignSheet = ({
  visible,
  job,
  staffList,
  loadingStaff,
  selectedStaff,
  onSelectStaff,
  onAccept,
  onDecline,
  submitting = false,
  showStaffSection = false,
  staffSelectionRequired = true,
  description,
  requiredDocuments = [],
}: StaffAssignSheetProps) => {
  const [showStaffModal, setShowStaffModal] = useState(false);
  if (!visible || !job) return null;
  const selectedName = selectedStaff
    ? staffList.find((s) => s.id === selectedStaff)?.name ||
      `Staff #${selectedStaff}`
    : null;

  const staffRequiredButMissing =
    staffSelectionRequired &&
    showStaffSection &&
    staffList.length > 0 &&
    !selectedStaff;

  const hasWorkingWithChildren = requiredDocuments.includes(
    "working_with_children",
  );
  const hasWhiteCard = requiredDocuments.includes("white_card");
  const capitalizeWords = (text?: string) => {
    if (!text) return "";
    return text.replace(/\b\w/g, (char) => char.toUpperCase());
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!submitting) onDecline();
      }}
    >
      <View style={assignStyles.overlay}>
        <View style={assignStyles.sheet}>
          <View style={assignStyles.handle} />
          <Text style={assignStyles.title}>🔔 Accept Job</Text>
          <ScrollView
            style={assignStyles.scrollArea}
            contentContainerStyle={assignStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Job Info Cards */}
            <View style={assignStyles.infoCard}>
              <CalendarDays size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={assignStyles.infoLabel}>Date</Text>
                <Text style={assignStyles.infoValue}>{job.date}</Text>
              </View>
            </View>

            <View style={assignStyles.infoCard}>
              <Clock size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={assignStyles.infoLabel}>Time</Text>
                <Text style={assignStyles.infoValue}>
                  {job.startTime} – {job.endTime}
                </Text>
              </View>
            </View>

            <View style={assignStyles.infoCard}>
              <MapPin size={16} color={COLORS.danger} />
              <View style={{ flex: 1 }}>
                <Text style={assignStyles.infoLabel}>Location</Text>
                <Text style={assignStyles.infoValue} numberOfLines={3}>
                  {job.address}
                </Text>
              </View>
            </View>

            <View style={assignStyles.infoCard}>
              <Briefcase size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={assignStyles.infoLabel}>Site</Text>
                <Text style={assignStyles.infoValue}>{job.siteName}</Text>
              </View>
            </View>

            {!!description && (
              <View style={assignStyles.infoCard}>
                <FileText size={18} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={assignStyles.infoLabel}>Description</Text>
                  <Text style={assignStyles.infoValue}>{description}</Text>
                </View>
              </View>
            )}

            {requiredDocuments.length > 0 && (
              <View style={styles.documentsSection}>
                <Text style={styles.documentsSectionTitle}>
                  Required Documents
                </Text>

                {requiredDocuments.map((doc, index) => {
                  const labelMap: Record<string, string> = {
                    working_with_children:
                      "Working With Children Check Required",
                    white_card: "White Card Required",
                    security_license: "Security Licence",
                    first_aid: "First Aid Certificate",
                    rsa_certificate: "RSA Certificate",
                  };

                  return (
                    <View
                      key={doc}
                      style={[
                        styles.documentRow,
                        index === requiredDocuments.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <Text style={styles.documentLabel}>
                        {labelMap[doc] ||
                          doc
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>

                      <Text style={styles.documentYes}>YES</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {showStaffSection && (
              <>
                <Text style={assignStyles.assignLabel}>
                  Assign to Staff Member
                </Text>

                {loadingStaff ? (
                  <View style={assignStyles.loadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={assignStyles.loadingText}>Loading staff…</Text>
                  </View>
                ) : staffList.length === 0 ? (
                  <View style={assignStyles.noStaffBox}>
                    <Text style={assignStyles.noStaffText}>
                      No staff available
                    </Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[
                        assignStyles.staffSelector,
                        selectedStaff !== null
                          ? assignStyles.staffSelectorSelected
                          : undefined,
                      ]}
                      onPress={() => setShowStaffModal(true)}
                      activeOpacity={0.8}
                      disabled={submitting}
                    >
                      <View style={assignStyles.staffSelectorLeft}>
                        <View
                          style={[
                            assignStyles.staffIconWrap,
                            selectedStaff !== null
                              ? { backgroundColor: "rgba(0,169,157,0.2)" }
                              : undefined,
                          ]}
                        >
                          <UserCheck
                            size={18}
                            color={
                              selectedStaff !== null
                                ? COLORS.primary
                                : COLORS.textMuted
                            }
                          />
                        </View>
                        <Text
                          style={[
                            assignStyles.staffSelectorText,
                            selectedStaff !== null
                              ? { color: COLORS.text }
                              : undefined,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedName
                            ? capitalizeWords(selectedName)
                            : "Tap to select staff member"}
                        </Text>
                      </View>
                      <ChevronDown
                        size={18}
                        color={
                          selectedStaff !== null
                            ? COLORS.primary
                            : COLORS.textMuted
                        }
                      />
                    </TouchableOpacity>

                    {!selectedStaff && staffSelectionRequired && (
                      <Text style={assignStyles.requiredHint}>
                        * Staff selection is required to accept
                      </Text>
                    )}

                    <Modal
                      visible={showStaffModal}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setShowStaffModal(false)}
                    >
                      <View style={assignStyles.pickerOverlay}>
                        <View style={assignStyles.pickerSheet}>
                          <Text style={assignStyles.pickerTitle}>
                            Select Staff Member
                          </Text>
                          <FlatList
                            data={staffList}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={[
                                  assignStyles.pickerItem,
                                  selectedStaff === item.id &&
                                    assignStyles.pickerItemSelected,
                                ]}
                                onPress={() => {
                                  onSelectStaff(item.id);
                                  setShowStaffModal(false);
                                }}
                                activeOpacity={0.75}
                              >
                                <View style={assignStyles.pickerItemLeft}>
                                  <View style={assignStyles.pickerAvatar}>
                                    <Text style={assignStyles.pickerAvatarText}>
                                      {getInitials(
                                        item.name || item.email || "?",
                                      )}
                                    </Text>
                                  </View>
                                  <View>
                                    <Text style={assignStyles.pickerItemName}>
                                      {item.name
                                        ? capitalizeWords(item.name)
                                        : item.email
                                        ? capitalizeWords(item.email)
                                        : `Staff #${item.id}`}
                                    </Text>
                                    {item.email && item.name && (
                                      <Text
                                        style={assignStyles.pickerItemEmail}
                                      >
                                        {item.email}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                                {selectedStaff === item.id && (
                                  <CheckCircle
                                    size={18}
                                    color={COLORS.primary}
                                  />
                                )}
                              </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                            ItemSeparatorComponent={() => (
                              <View
                                style={{
                                  height: 1,
                                  backgroundColor: COLORS.cardBorder,
                                }}
                              />
                            )}
                          />
                          <TouchableOpacity
                            style={assignStyles.pickerCancel}
                            onPress={() => setShowStaffModal(false)}
                          >
                            <Text style={assignStyles.pickerCancelText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  </>
                )}
              </>
            )}
          </ScrollView>

          <View style={assignStyles.buttonRow}>
            <TouchableOpacity
              style={[
                assignStyles.acceptBtn,
                (staffRequiredButMissing || submitting) &&
                  assignStyles.acceptBtnDisabled,
              ]}
              onPress={onAccept}
              disabled={staffRequiredButMissing || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <CheckCircle size={16} color="#fff" />
                  <Text style={assignStyles.acceptBtnText}>ACCEPT JOB</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                assignStyles.declineBtn,
                submitting && assignStyles.acceptBtnDisabled,
              ]}
              onPress={onDecline}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <XCircle size={16} color="#fff" />
              <Text style={assignStyles.declineBtnText}>SKIP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface PendingConfirmationModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const PendingConfirmationModal = ({
  visible,
  onDismiss,
}: PendingConfirmationModalProps) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={pendingConfirmStyles.overlay}>
        <View style={pendingConfirmStyles.card}>
          <LinearGradient
            colors={[COLORS.primary, "#0C7C72"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={pendingConfirmStyles.headerBand}
          />

          <View style={pendingConfirmStyles.iconRing}>
            <View style={pendingConfirmStyles.iconCircle}>
              <CheckCircle size={30} color={COLORS.success} />
            </View>
          </View>

          <View style={pendingConfirmStyles.body}>
            <Text style={pendingConfirmStyles.title}>Success!</Text>
            <Text style={pendingConfirmStyles.message}>
              Please wait for the client to give further confirmation. We will
              notify you shortly and the shift will appear on your Accepted Jobs
              page.
            </Text>

            <TouchableOpacity
              style={pendingConfirmStyles.button}
              onPress={onDismiss}
              activeOpacity={0.85}
            >
              <ThumbsUp size={16} color="#fff" />
              <Text style={pendingConfirmStyles.buttonText}>
                Awesome, Thanks!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const pendingConfirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  headerBand: {
    width: "100%",
    height: 96,
  },
  iconRing: {
    marginTop: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(52,200,138,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B1220",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: "#5B6472",
    textAlign: "center",
    marginBottom: 22,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

// ─── Accept Sheet Styles ───────────────────────────────────────────────────────
export const assignStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    maxHeight: "98%",
  },
  // Scrollable middle section of the sheet — everything between the
  // title and the pinned Accept/Skip buttons. flexShrink lets it give up
  // space to its siblings first, then scroll internally once the sheet
  // hits its maxHeight.
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    color: COLORS.primary,
    fontWeight: "700",
    marginBottom: 14,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  assignLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  noStaffBox: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  noStaffText: {
    color: COLORS.danger,
    fontWeight: "600",
    fontSize: 14,
  },
  staffSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  staffSelectorSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(0,169,157,0.06)",
  },
  staffSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  staffIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  staffSelectorText: {
    fontSize: 14,
    color: COLORS.textMuted,
    flex: 1,
  },
  requiredHint: {
    fontSize: 11,
    color: COLORS.warning,
    marginTop: 6,
    marginLeft: 4,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerSheet: {
    width: "88%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    maxHeight: "65%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  pickerItemSelected: {
    backgroundColor: "rgba(0,169,157,0.08)",
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  pickerItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pickerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  pickerAvatarText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  pickerItemName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "600",
  },
  pickerItemEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pickerCancel: {
    marginTop: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pickerCancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: COLORS.success,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  acceptBtnDisabled: {
    opacity: 0.45,
  },
  acceptBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  declineBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});

// ─── Tab bar styles ───────────────────────────────────────────────────────────
export const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginVertical: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#ccc",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ─── Available job card styles ────────────────────────────────────────────────
export const cardStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  siteIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  siteNameText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  statusBadgeText: { color: COLORS.warning, fontSize: 10, fontWeight: "700" },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginBottom: 10 },
  ratePill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryGlow,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  rateText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
  acceptjobButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 5,
    width: "40%",
    alignSelf: "center",
  },
  acceptjobText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  emptyContainer: { paddingVertical: 60, alignItems: "center" },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  rowItem: {
    flexDirection: "row",
    flex: 1,
    alignItems: "flex-start",
  },

  documentText: {
    flex: 1,
    marginLeft: 10,
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    flexWrap: "wrap",
  },

  actionButton: {
    alignSelf: "flex-start",
    marginLeft: 10,
    minWidth: 90,
  },
  // Load-more footer
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  footerEndText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  loadMoreButton: {
    marginTop: 6,
    marginBottom: 20,
    alignSelf: "center",
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  loadMoreButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  // container: {
  //   flex: 1,
  //   backgroundColor: COLORS.background,
  //   paddingTop: 40,
  //   paddingHorizontal: 16,
  // },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
  },
  initialsAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
  },
  initialsText: { color: COLORS.primary, fontSize: 18, fontWeight: "700" },
  greeting: { fontSize: 16, color: COLORS.text, fontWeight: "700" },
  staffName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "400",
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 2,
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  shiftCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 5,
  },
  rowText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
    marginTop: 8,
  },
  iconBgGrey: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  addressText: {
    fontSize: 11,
    color: "#ccc",
    flex: 1,
    flexWrap: "wrap",
    marginTop: 5,
  },
  addressContainer: { flex: 1, marginRight: 15 },
  documentText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginTop: 10,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  detailsValue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
  },
  signInButton: {
    backgroundColor: "rgba(245,166,35,0.15)",
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  ongoingButton: {
    backgroundColor: "rgba(52,200,138,0.12)",
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  viewButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  actionButtonText: { fontSize: 11, fontWeight: "700" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  loadingText: { marginTop: 16, fontSize: 14, color: COLORS.textSecondary },
  emptyBlock: { paddingVertical: 20, alignItems: "center" },
  emptyText: { textAlign: "center", fontSize: 13, color: COLORS.textMuted },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
    paddingVertical: 40,
  },
  disabledButton: { opacity: 0.45 },
  sheetBackground: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sheetHandle: {
    backgroundColor: COLORS.textMuted,
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  sheetContent: { paddingHorizontal: 15, paddingTop: 4, paddingBottom: 44 },
  newRequest: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "700",
    marginBottom: 13,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 14,
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "500" },
  infoTextt: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "500" },
  addressInSheet: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    flex: 1,
  },
  // ── Required Documents block (notification bottom sheet) ──
  documentsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    marginBottom: 14,
  },
  documentsSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  documentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  documentLabel: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "500",
    flex: 1,
    paddingRight: 10,
  },
  documentYes: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },
  assignLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  // ── Contractor "Assign to Staff Member" block on Accepted-tab shift cards ──
  contractorAssignSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  buttonContainer: { flexDirection: "row", gap: 10, marginTop: 10 },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  buttonText: { color: "white", fontSize: 13, fontWeight: "700" },
  customDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
    overflow: "hidden",
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  dropdownText: { fontSize: 14, color: COLORS.textMuted, flexShrink: 1 },
  iconRight: { marginLeft: 10, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModal: {
    width: "85%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    maxHeight: "60%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },
  staffItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  staffNameText: { fontSize: 15, color: COLORS.text },
  cancelButtonModal: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 15 },
  customDropdownAssigned: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(52,200,138,0.08)",
  },
  assignedBadge: {
    backgroundColor: "rgba(52,200,138,0.15)",
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  assignedBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  // ── Cover Jobs Banner ──
  coverJobsBanner: {
    marginTop: 25, // remove top margin
    marginBottom: 12,

    borderRadius: 0, // optional – remove rounded corners if you want edge-to-edge
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#0B1C2C",
    width: "auto",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  coverJobsLeft: {
    flex: 1,
  },
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2DD4BF",
    marginRight: 8,
  },
  availableLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#fff",
    textTransform: "uppercase",
  },
  coverJobsTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  coverJobsSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  fixedHeader: {
    backgroundColor: COLORS.background,
    paddingBottom: 5,
  },

  hero: {
    paddingTop: Platform.OS === "ios" ? 5 : 26,
    paddingBottom: 10,
    paddingHorizontal: Platform.OS === "ios" ? 0 : 10,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderColor: COLORS.cardBorder,

    height: Platform.OS === "ios" ? 200 : undefined,
  },

  heroInner: {
    width: "100%",
    paddingHorizontal: 10,
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(52,200,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(52,200,138,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },

  liveText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  statBox: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },

  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 8,
  },
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  userInfo: {
    flex: 1,
    marginLeft: 12,
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },

  heroSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
