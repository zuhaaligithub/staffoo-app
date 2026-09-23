

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
  ShieldCheck,
} from "lucide-react-native";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
} from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";


export const COLORS = {
  // Base surfaces
  background: "#0B0E13",
  backgroundAlt: "#05070A",
  surface: "#121722",
  surfaceRaised: "#161C28",
  card: "#141A24",
  cardSoft: "#10141C",
  cardBorder: "rgba(148,163,184,0.14)",
  cardBorderStrong: "rgba(148,163,184,0.24)",
  hairline: "rgba(148,163,184,0.10)",

  // Brand signal — warm brass/amber (badge & authority), not teal
  primary: "#00A99D",
  primaryDeep: "#007F77",
  primarySoft: "rgba(0, 169, 157, 0.12)",
  primaryBorder: "rgba(0, 169, 157, 0.25)",
  primaryGlow: "rgba(0, 169, 157, 0.25)",

  // Secondary — cool steel blue for informational accents
  info: "#6E9BEF",
  infoSoft: "rgba(110,155,239,0.14)",

  // Text
  text: "#F3F5F8",
  textSecondary: "#9BA8BA",
  textMuted: "#5D6B7E",
  textOnPrimary: "#1A1204",

  // Status
  success: "#3FBF8A",
  successSoft: "rgba(63,191,138,0.14)",
  successBorder: "rgba(63,191,138,0.34)",
  danger: "#E5637A",
  dangerBg: "rgba(229,99,122,0.14)",
  warning: "#E3A343",
  warningBg: "rgba(227,163,67,0.14)",

  // Hero gradient (kept as a 2-stop array for LinearGradient compatibility)
  heroBg1: "#171E2C",
  heroBg2: "#080B10",
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

// ─────────────────────────────────────────────────────────────────────────
// Small reusable presentation primitives — purely visual, no business logic.
// ─────────────────────────────────────────────────────────────────────────

export const IconBadge = ({
  children,
  size = 36,
  tone = "primary",
}: {
  children: React.ReactNode;
  size?: number;
  tone?: "primary" | "info" | "success" | "danger" | "neutral";
}) => {
  const toneMap: Record<string, { bg: string; border: string }> = {
    primary: { bg: COLORS.primarySoft, border: COLORS.primaryBorder },
    info: { bg: COLORS.infoSoft, border: "rgba(110,155,239,0.30)" },
    success: { bg: COLORS.successSoft, border: COLORS.successBorder },
    danger: { bg: COLORS.dangerBg, border: "rgba(229,99,122,0.32)" },
    neutral: { bg: "rgba(148,163,184,0.10)", border: COLORS.cardBorder },
  };
  const c = toneMap[tone] || toneMap.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
};

export const StatusPill = ({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "primary" | "success" | "danger" | "warning" | "neutral";
}) => {
  const toneMap: Record<
    string,
    { bg: string; border: string; dot: string; text: string }
  > = {
    primary: {
      bg: COLORS.primarySoft,
      border: COLORS.primaryBorder,
      dot: COLORS.primary,
      text: COLORS.primary,
    },
    success: {
      bg: COLORS.successSoft,
      border: COLORS.successBorder,
      dot: COLORS.success,
      text: COLORS.success,
    },
    danger: {
      bg: COLORS.dangerBg,
      border: "rgba(229,99,122,0.32)",
      dot: COLORS.danger,
      text: COLORS.danger,
    },
    warning: {
      bg: COLORS.warningBg,
      border: COLORS.primaryBorder,
      dot: COLORS.warning,
      text: COLORS.warning,
    },
    neutral: {
      bg: "rgba(148,163,184,0.10)",
      border: COLORS.cardBorder,
      dot: COLORS.textSecondary,
      text: COLORS.textSecondary,
    },
  };
  const c = toneMap[tone] || toneMap.neutral;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dot }}
      />
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: "700",
          color: c.text,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

export interface GradientButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "success" | "danger" | "outline";
  flex?: number;
  style?: any;
}

export const GradientButton = ({
  onPress,
  disabled,
  loading,
  label,
  icon,
  variant = "primary",
  flex,
  style,
}: GradientButtonProps) => {
  const isOutline = variant === "outline";
  const gradientMap: Record<string, [string, string]> = {
    primary: [COLORS.primary, COLORS.primaryDeep],
    success: ["#4AD1A0", "#289C72"],
    danger: ["#EE7C90", "#C64A61"],
    outline: [COLORS.card, COLORS.card],
  };
  const textColor =
    variant === "primary"
      ? COLORS.textOnPrimary
      : isOutline
      ? COLORS.textSecondary
      : "#FFFFFF";

  const content = (
    <View style={btnStyles.inner}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[btnStyles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[{ flex: flex ?? undefined, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {isOutline ? (
        <View
          style={[
            btnStyles.outlineWrap,
            { borderColor: COLORS.cardBorderStrong },
          ]}
        >
          {content}
        </View>
      ) : (
        <LinearGradient
          colors={gradientMap[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={btnStyles.gradientWrap}
        >
          {content}
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

const btnStyles = StyleSheet.create({
  gradientWrap: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineWrap: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: COLORS.card,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

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

          <View style={assignStyles.titleRow}>
            <IconBadge size={40} tone="primary">
              <ShieldCheck size={16} color={COLORS.primary} />
            </IconBadge>
            <View style={{ flex: 1 }}>
              <Text style={assignStyles.titleEyebrow}>Job request</Text>
              <Text style={assignStyles.title}>Review and Accept</Text>
            </View>
          </View>

          <ScrollView
            style={assignStyles.scrollArea}
            contentContainerStyle={assignStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={assignStyles.infoGrid}>
              <View style={assignStyles.infoCard}>
                <IconBadge size={32} tone="primary">
                  <CalendarDays size={15} color={COLORS.primary} />
                </IconBadge>
                <View style={{ flex: 1 }}>
                  <Text style={assignStyles.infoLabel}>Date</Text>
                  <Text style={assignStyles.infoValue}>{job.date}</Text>
                </View>
              </View>

              <View style={assignStyles.infoCard}>
                <IconBadge size={32} tone="info">
                  <Clock size={15} color={COLORS.info} />
                </IconBadge>
                <View style={{ flex: 1 }}>
                  <Text style={assignStyles.infoLabel}>Time</Text>
                  <Text style={assignStyles.infoValue}>
                    {job.startTime} – {job.endTime}
                  </Text>
                </View>
              </View>
            </View>

            <View style={assignStyles.infoCard}>
              <IconBadge size={32} tone="danger">
                <MapPin size={15} color={COLORS.danger} />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <Text style={assignStyles.infoLabel}>Location</Text>
                <Text style={assignStyles.infoValue} numberOfLines={3}>
                  {job.address}
                </Text>
              </View>
            </View>

            <View style={assignStyles.infoCard}>
              <IconBadge size={32} tone="primary">
                <Briefcase size={15} color={COLORS.primary} />
              </IconBadge>
              <View style={{ flex: 1 }}>
                <Text style={assignStyles.infoLabel}>Site</Text>
                <Text style={assignStyles.infoValue}>{job.siteName}</Text>
              </View>
            </View>

            {!!description && (
              <View style={assignStyles.infoCard}>
                <IconBadge size={32} tone="neutral">
                  <FileText size={15} color={COLORS.textSecondary} />
                </IconBadge>
                <View style={{ flex: 1 }}>
                  <Text style={assignStyles.infoLabel}>Description</Text>
                  <Text style={assignStyles.infoValue}>{description}</Text>
                </View>
              </View>
            )}

            {requiredDocuments.length > 0 && (
              <View style={styles.documentsSection}>
                <Text style={styles.documentsSectionTitle}>
                  Required documents
                </Text>

                {requiredDocuments.map((doc, index) => {
                  const labelMap: Record<string, string> = {
                    working_with_children:
                      "Working With Children Check Required",
                    white_card: "White Card Required",
                    rsa_certificate: "RSA Certificate Required",
                    msic_card: "MSIC Card Required",
                    control_room_certificate:
                      "Control Room Certificate Required",
                    ras_certificate: "RAS Certificate Required",
                    security_license: "Security Licence Required",
                    first_aid: "First Aid Certificate Required",
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
                      <StatusPill label="YES" />
                    </View>
                  );
                })}
              </View>
            )}

            {showStaffSection && (
              <>
                <Text style={assignStyles.assignLabel}>
                  Assign to staff member
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
                        <IconBadge
                          size={34}
                          tone={selectedStaff !== null ? "success" : "neutral"}
                        >
                          <UserCheck
                            size={16}
                            color={
                              selectedStaff !== null
                                ? COLORS.success
                                : COLORS.textMuted
                            }
                          />
                        </IconBadge>
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
                        Staff selection is required to accept
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
                            Select staff member
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
                                  backgroundColor: COLORS.hairline,
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
            <GradientButton
              variant="success"
              flex={2}
              onPress={onAccept}
              disabled={staffRequiredButMissing || submitting}
              loading={submitting}
              label="Accept job"
              icon={<CheckCircle size={17} color="#fff" />}
            />
            <GradientButton
              variant="outline"
              flex={1}
              onPress={onDecline}
              disabled={submitting}
              label="Skip"
              icon={<XCircle size={16} color={COLORS.textSecondary} />}
            />
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
            colors={[COLORS.primary, COLORS.primaryDeep]}
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
            <Text style={pendingConfirmStyles.title}>Request sent</Text>
            <Text style={pendingConfirmStyles.message}>
              Please wait for the client to give further confirmation. We will
              notify you shortly and the shift will appear on your Accepted Jobs
              page.
            </Text>

            <GradientButton
              variant="primary"
              onPress={onDismiss}
              label="Awesome, thanks!"
              icon={<ThumbsUp size={16} color={COLORS.textOnPrimary} />}
              style={{ width: "100%" }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const pendingConfirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4,6,9,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerBand: {
    width: "100%",
    height: 88,
  },
  iconRing: {
    marginTop: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surfaceRaised,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.surfaceRaised,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.successSoft,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 22,
  },
});

// ─── Accept Sheet Styles ───────────────────────────────────────────────────
export const assignStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4,6,9,0.78)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 15,
    paddingTop: 8,
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
    backgroundColor: COLORS.cardBorderStrong,
    alignSelf: "center",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  titleEyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "800",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 5,
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 10.5,
    color: COLORS.text,
    fontWeight: "600",
  },
  assignLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 4,
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
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(229,99,122,0.32)",
  },
  noStaffText: {
    color: COLORS.danger,
    fontWeight: "600",
    fontSize: 12,
  },
  staffSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  staffSelectorSelected: {
    borderColor: COLORS.successBorder,
    backgroundColor: COLORS.successSoft,
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
    backgroundColor: "rgba(4,6,9,0.82)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerSheet: {
    width: "88%",
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 22,
    padding: 20,
    maxHeight: "65%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
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
    borderRadius: 13,
    backgroundColor: COLORS.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  pickerAvatarText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  pickerItemName: {
    fontSize: 14.5,
    color: COLORS.text,
    fontWeight: "700",
  },
  pickerItemEmail: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pickerCancel: {
    marginTop: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pickerCancelText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    fontSize: 14.5,
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
    borderRadius: 16,
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
    letterSpacing: 0.3,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 15,
    borderRadius: 16,
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

// ─── Tab bar styles ─────────────────────────────────────────────────────────
export const tabStyles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginVertical: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
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
  badgeText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: "700" },
});

// ─── Available job card styles ──────────────────────────────────────────────
export const cardStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  siteIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  siteNameText: {
    fontSize: 15.5,
    color: COLORS.text,
    fontWeight: "800",
    flex: 1,
    letterSpacing: 0.1,
  },
  statusBadge: {
    // backgroundColor: COLORS.warningBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  statusBadgeText: { color: COLORS.warning, fontSize: 10, fontWeight: "700" },
  divider: { height: 1, backgroundColor: COLORS.hairline, marginBottom: 12 },
  ratePill: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
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
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  emptyContainer: { paddingVertical: 70, alignItems: "center" },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16.5,
    fontWeight: "700",
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
    color: COLORS.text,
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
    paddingVertical: 20,
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
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  loadMoreButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});

// ─── Main styles ────────────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerGradient: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
  },
  initialsAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
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
    fontSize: 12,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 2,
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  shiftCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderRadius: 22,
    marginHorizontal: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 2,
  },
  rowText: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "600",
    marginTop: 8,
  },
  iconBgGrey: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  addressText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    flexWrap: "wrap",
    marginTop: 2,
    lineHeight: 15,
  },
  addressContainer: { flex: 1, marginRight: 15 },
  documentText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginTop: 8,
    lineHeight: 17,
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
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 92,
    alignItems: "center",
  },
  signInButton: {
    // backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  ongoingButton: {
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },
  viewButton: {
    backgroundColor: COLORS.cardSoft,
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
  emptyBlock: { paddingVertical: 24, alignItems: "center" },
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sheetHandle: {
    backgroundColor: COLORS.cardBorderStrong,
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  sheetContent: { paddingHorizontal: 10, paddingTop: 1, paddingBottom: 44 },
  newRequest: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "800",
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 12,
    backgroundColor: COLORS.card,
    padding: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoText: { fontSize: 10, color: COLORS.text, fontWeight: "600" },
  infoTextt: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "500" },
  addressInSheet: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    lineHeight: 17,
  },
  // ── Required Documents block (notification bottom sheet) ──
  documentsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
    marginBottom: 8,
  },
  documentsSectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  documentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  documentLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
    flex: 1,
    paddingRight: 10,
  },
  documentYes: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
  },
  assignLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  // ── Contractor "Assign to Staff Member" block on Accepted-tab shift cards ──
  contractorAssignSection: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  buttonContainer: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 12,
    borderRadius: 16,
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
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
    overflow: "hidden",
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  dropdownText: { fontSize: 13, color: COLORS.textMuted, flexShrink: 1 },
  iconRight: { marginLeft: 10, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,6,9,0.78)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModal: {
    width: "85%",
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 20,
    padding: 12,
    maxHeight: "60%",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 16,
  },
  staffItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  staffNameText: { fontSize: 14.5, color: COLORS.text, fontWeight: "600" },
  cancelButtonModal: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: "700",
    fontSize: 14.5,
  },
  customDropdownAssigned: {
    borderColor: COLORS.successBorder,
    backgroundColor: COLORS.successSoft,
  },
  assignedBadge: {
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
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
  // ── Cover Jobs Banner (Available screen top strip) ──
  coverJobsBanner: {
    marginTop: 22,
    marginBottom: 6,
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    // borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  coverJobsLeft: { flex: 1 },
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 9,
  },
  availableLabel: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: COLORS.text,
    textTransform: "uppercase",
  },
  coverJobsTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  coverJobsSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginTop: 6,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    backgroundColor: COLORS.background,
    paddingBottom: 4,
  },
  hero: {
    paddingTop: Platform.OS === "ios" ? 8 : 24,
    paddingBottom: 12,
    paddingHorizontal: Platform.OS === "ios" ? 0 : 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
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
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.successSoft,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
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
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: Platform.OS === "ios" ? 20 : 14,
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.7,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginHorizontal: 10,
  },
  userHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },
});
