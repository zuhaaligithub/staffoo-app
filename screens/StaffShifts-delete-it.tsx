import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
  AppState,
  AppStateStatus,
  Alert,
  Vibration,
} from "react-native";
import {
  ChevronDown,
  UserCheck,
  CheckCircle,
  XCircle,
  Briefcase,
} from "lucide-react-native";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
} from "lucide-react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import BottomTab from "./BottomTab";
import JobAcceptedCelebration from "./JobAcceptedCelebration";
import { playSound } from "../utils/soundPlayer";
import Toast from "react-native-toast-message";
import {
  getUserProfile,
  getContractorStaff,
  postGuardJobs,
  BASE_URL,
} from "../services/authApi";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";
import { PENDING_ASAP_NOTIFICATION_KEY } from "../App";

// ─── Design System ─────────────────────────────────────────────────────────────
const COLORS = {
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

const PENDING_NOTIF_KEY = "@pending_asap_notification";

let globalLastHandledNotifKey: string | null = null;
let globalIsCheckingPending = false;

// ─── Types ─────────────────────────────────────────────────────────────────────
type AvailableJob = {
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

type Props = { navigation: any; route: any };

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (val: any): string => {
  if (!val) return "—";
  const clean = String(val).split("T")[0].split(" ")[0];
  const parts = clean.includes("-") ? clean.split("-") : clean.split("/");
  if (parts.length !== 3) return "—";
  let [y, m, d] = parts;
  if (y.length === 4) return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  return `${y.padStart(2, "0")}/${m.padStart(2, "0")}/${d}`;
};

const formatTime = (val: any): string => {
  if (!val) return "—";
  const str = String(val).trim();
  const parts = str.split(" ");
  const time = parts[1] || parts[0];
  if (time && time.includes(":")) return time.slice(0, 5);
  return "—";
};

const capitalizeName = (name: string = ""): string =>
  name
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
};

const shapeJobForDetails = (raw: any) => {
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

// Stable key used to dedupe / identify a notification payload, regardless of shape
const getNotifKey = (job: any): string => {
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

const parseDocumentList = (docList: any): string[] => {
  if (!docList) return [];
  if (Array.isArray(docList)) return docList;
  try {
    const parsed = JSON.parse(docList);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const extractJobData = (notif: any): any => {
  if (!notif) return {};

  // 1. Direct match (most common for Available Jobs)
  if (notif?.id && (notif.start_time || notif.start || notif.end_time)) {
    return notif;
  }

  // 2. Common notification wrappers
  if (notif?.additionalData?.roster?.roster?.id)
    return notif.additionalData.roster.roster;
  if (notif?.additionalData?.roster?.id) return notif.additionalData.roster;
  if (notif?.roster?.roster?.id) return notif.roster.roster;
  if (notif?.roster?.id) return notif.roster;

  // 3. Deep search with priority to job-like objects
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

const JOBS_PAGE_SIZE = 50;

// ─── Accept Job Bottom Sheet Component ────────────────────────────────────────
// Used for the "Available Jobs" tab. The API call happens *inside* this sheet —
// on success the sheet closes itself (via the parent's onAccept handler).
// NOTE: Staff assignment is no longer done here — contractors accept the job
// directly and assign it to a staff member later, from the "Accepted" tab.
interface StaffAssignSheetProps {
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
  // When true (default, matches old behaviour) a staff pick is mandatory
  // before ACCEPT is enabled. Pass false to make it optional — used by the
  // "Available Jobs" accept sheet, where guard assignment is a choice, not
  // a requirement.
  staffSelectionRequired?: boolean;
  // Optional job description + required-document flags to render above the
  // staff section. All optional / additive — omitting them changes nothing.
  description?: string;
  requiredDocuments?: string[];
}

const StaffAssignSheet = ({
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
          {/* Handle bar */}
          <View style={assignStyles.handle} />

          {/* Title */}
          <Text style={assignStyles.title}>🔔 Accept Job</Text>

          {/* Scrollable content — kicks in once the info cards, description,
              required documents, and staff list push past the sheet's
              max height. Action buttons stay pinned below, outside the
              scroll area, so they're always reachable. */}
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

            {/* Staff Assignment Section — shown when showStaffSection is true
                (currently: only the "Available Jobs" accept sheet, contractor
                only). Selection is optional here (staffSelectionRequired is
                passed as false by that caller) — picking a guard sends their
                id with the accept request, leaving it unpicked sends none. */}
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
                    {/* Staff selector button */}
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

                    {/* Staff picker modal */}
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

          {/* Action buttons — pinned below the scroll area, always visible */}
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

// ─── Component ─────────────────────────────────────────────────────────────────
export default function StaffShifts({ navigation, route }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["95%", "98%"], []);

  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [todayShifts, setTodayShifts] = useState<any[]>([]);
  const [weekShifts, setWeekShifts] = useState<any[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingWeek, setLoadingWeek] = useState(false);

  const [userType, setUserType] = useState<string>("");
  const [userId, setUserId] = useState<number>(0);

  const screenMode: "accepted" | "available" =
    route?.name === "AcceptedJobs" ? "accepted" : "available";

  const isStaffooStaff = userId === 1;

  const [contractorAvailableSubTab, setContractorAvailableSubTab] = useState<
    "Available Jobs" | "Pending Assigning"
  >("Available Jobs");

  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [notificationJob, setNotificationJob] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [acceptingNotification, setAcceptingNotification] = useState(false);

  // Per-instance mirror of the module-level key (kept for any legacy
  // reads elsewhere in this file); the actual dedupe decision is made
  // against globalLastHandledNotifKey so it holds across both mounted
  // instances of this component (StaffShifts + AcceptedJobs tabs).
  const lastHandledNotifKeyRef = useRef<string | null>(null);
  const isSheetReadyRef = useRef(false);

  // Bumped every time a *new* job successfully takes over the sheet.
  // closingGenerationRef captures "which job's close request is this"
  // so a late-arriving onChange(-1)/onClose callback from an OLD job
  // can never wipe out state that now belongs to a NEWER job.
  const notifGenerationRef = useRef(0);
  const closingGenerationRef = useRef<number | null>(null);

  // Set right before we close the sheet after a successful accept.
  // handleSheetClose reads this once the sheet's own onChange(-1) fires,
  // so navigation only happens *after* the sheet has actually finished
  // closing — no racing setTimeouts.
  const pendingAcceptSuccessRef = useRef(false);

  const [acceptSheetJob, setAcceptSheetJob] = useState<AvailableJob | null>(
    null,
  );
  const [acceptSheetVisible, setAcceptSheetVisible] = useState(false);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  const [showCelebration, setShowCelebration] = useState(false);
  const celebrateJobAccepted = useCallback(() => {
    setShowCelebration(true);
    Vibration.vibrate([0, 80, 60, 120]);
    playSound("success");
  }, []);
  // Guard optionally picked from the Accept Job sheet's staff dropdown
  // (contractor only). Separate from the Accepted-tab assign flow's own
  // state (assignTargetShift / shiftStaffAssignments) so the two features
  // never interfere with each other.
  const [acceptSheetSelectedGuard, setAcceptSheetSelectedGuard] = useState<
    number | null
  >(null);

  // Guard optionally picked from the ASAP notification bottom sheet's own
  // dropdown (contractor only). Kept separate from acceptSheetSelectedGuard
  // (Available Jobs accept sheet) and shiftStaffAssignments (Accepted tab)
  // — three different pickers, three different flows, no shared state.
  const [notifSelectedGuard, setNotifSelectedGuard] = useState<number | null>(
    null,
  );
  const [showNotifGuardModal, setShowNotifGuardModal] = useState(false);

  // ── Available Jobs pagination / "load more" state ───────────────────────
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalJobsCount, setTotalJobsCount] = useState<number | null>(null);
  // Prevents overlapping requests (e.g. pull-to-refresh while a load-more
  // request is already in flight)
  const isFetchingJobsRef = useRef(false);

  // ── Contractor staff (used for the "Assign to Staff Member" dropdown
  // that now lives on shift cards in the Accepted tab) ────────────────────
  const [contractorStaffList, setContractorStaffList] = useState<any[]>([]);
  const [loadingContractorStaff, setLoadingContractorStaff] = useState(false);

  // ── Assign-to-staff modal (Accepted tab, contractor only) ───────────────
  const [assignTargetShift, setAssignTargetShift] = useState<any>(null);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState(false);
  // Tracks which shift (by roster id) has been assigned to which staff
  // member locally, so the UI updates immediately after a successful call.
  const [shiftStaffAssignments, setShiftStaffAssignments] = useState<
    Record<string, { id: number; name: string }>
  >({});

  // ─── Load user from storage ─────────────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        const cachedImage = await AsyncStorage.getItem("profileImage");
        if (userStr) {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          if (cachedImage) {
            setProfileImage(cachedImage);
          } else if (parsedUser?.staff?.profile_image) {
            setProfileImage(
              `https://apis.staffoo.com.au/storage/${parsedUser.staff.profile_image}`,
            );
          }
        }
      } catch (e) {
        console.log("User load error", e);
      }
    };
    loadUser();
  }, []);

  // ─── Reset all notification-sheet state ─────────────────────────────────
  // If forGeneration is provided, the reset only actually applies when it
  // still matches the CURRENT generation — otherwise it's a stale call
  // (e.g. a delayed close callback from a job that's already been
  // superseded by a newer one) and is safely ignored.
  const resetNotificationState = useCallback((forGeneration?: number) => {
    if (
      forGeneration !== undefined &&
      forGeneration !== notifGenerationRef.current
    ) {
      console.log("[StaffShifts] Ignoring stale reset (generation mismatch)");
      return;
    }

    console.log("[StaffShifts] Resetting notification state");

    lastHandledNotifKeyRef.current = null;
    globalLastHandledNotifKey = null;
    isSheetReadyRef.current = false;

    setNotificationJob(null);
    setSheetOpen(false);
    setAcceptingNotification(false);
    setNotifSelectedGuard(null);

    // Force clear pending storage to prevent re-trigger
    AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY).catch(() => {});

    // Force close bottom sheet
    setTimeout(() => {
      bottomSheetRef.current?.close?.();
    }, 100);
  }, []);

  // ─── Open the bottom sheet for a given job ──────────────────────────────
  const openBottomSheet = useCallback((job: any) => {
    if (!job) return;

    // Never open a sheet for a job we can't actually show — this is the
    // guard that prevents the "sheet reopens but is empty" bug: if the
    // payload doesn't resolve to a real job id, we just skip it instead
    // of rendering a blank sheet.
    const jd = extractJobData(job);
    if (!jd?.id) {
      console.warn(
        "[StaffShifts] Ignoring notification with no resolvable job id",
      );
      return;
    }

    const key = getNotifKey(job);

    // Cross-instance dedupe: only one mounted instance of this component
    // (StaffShifts tab vs AcceptedJobs tab) may claim a given notification.
    if (globalLastHandledNotifKey === key) {
      console.log("[StaffShifts] Duplicate notification - skipping");
      return;
    }

    console.log("[StaffShifts] Opening BottomSheet for job:", key);
    globalLastHandledNotifKey = key;
    lastHandledNotifKeyRef.current = key;
    notifGenerationRef.current += 1; // this job is now the "current" one
    closingGenerationRef.current = null; // any pending close is now stale
    isSheetReadyRef.current = false;

    setAcceptingNotification(false);
    setNotifSelectedGuard(null);
    setNotificationJob(job);
    setSheetOpen(true);
  }, []);

  // ─── Single effect that drives opening the BottomSheet ──────────────────
  useEffect(() => {
    if (!sheetOpen || !notificationJob) return;

    // Belt-and-braces: if somehow a job with no valid id got this far,
    // don't render a blank sheet — close and reset instead.
    const jd = extractJobData(notificationJob);
    if (!jd?.id) {
      console.warn(
        "[StaffShifts] notificationJob has no id — closing instead of showing an empty sheet",
      );
      resetNotificationState();
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const tryOpenSheet = () => {
      if (cancelled) return;

      const ref = bottomSheetRef.current;
      if (!ref) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryOpenSheet, 80);
          return;
        }
        console.error("[StaffShifts] BottomSheet ref never ready");
        resetNotificationState();
        return;
      }

      console.log("[StaffShifts] Opening BottomSheet");
      isSheetReadyRef.current = true;
      ref.snapToIndex(0);
    };

    setTimeout(tryOpenSheet, 100);

    return () => {
      cancelled = true;
    };
  }, [sheetOpen, notificationJob, resetNotificationState]);

  // ─── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) return;
        const parsed = JSON.parse(stored);
        const idFromStorage = Number(parsed?.id);
        if (!idFromStorage) return;
        setUserId(idFromStorage);
        const res = await getUserProfile(idFromStorage);
        if (res?.success && res?.data) {
          setUserDocuments(res.data.documents || []);
          setUserType((res.data.user_type || "").trim().toLowerCase());
        } else {
          setUserType((parsed.user_type || "").trim().toLowerCase());
        }
      } catch (err) {
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserType((parsed.user_type || "").trim().toLowerCase());
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // ─── Load contractor's staff list (used by the Accepted-tab assign
  // dropdown). Loaded once whenever we know the user is a contractor. ───────
  useEffect(() => {
    if (userType !== "contractor" || !userId) return;
    let cancelled = false;
    const loadStaff = async () => {
      setLoadingContractorStaff(true);
      try {
        const res = await getContractorStaff(userId);
        if (cancelled) return;
        setContractorStaffList(res?.guards?.length ? res.guards : []);
      } catch (err) {
        console.error("[Contractor Staff Load Error]:", err);
        if (!cancelled) setContractorStaffList([]);
      } finally {
        if (!cancelled) setLoadingContractorStaff(false);
      }
    };
    loadStaff();
    return () => {
      cancelled = true;
    };
  }, [userType, userId]);

  // ─── Helper: map a raw API job object into our AvailableJob shape ──────────
  const mapAvailableJob = (job: any): AvailableJob => {
    let formattedDate = "TBD";

    if (job.start_time || job.start) {
      const d = new Date(job.start_time || job.start);
      formattedDate = `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}/${d.getFullYear()}`;
    }

    const startRaw = job.start_time || job.start;
    const endRaw = job.end_time || job.end;

    const startTime = startRaw
      ? new Date(startRaw).toLocaleTimeString("en-AU", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "TBD";

    const endTime = endRaw
      ? new Date(endRaw).toLocaleTimeString("en-AU", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "TBD";

    return {
      id: job.id,
      title: job.title || "Security Guard Shift",
      siteName: job.site_name || job.site?.site_name || "N/A",
      location: job.state ? job.state.toUpperCase() : "N/A",
      address:
        job.site_address ||
        job.address ||
        job.site?.address ||
        "Address not available",
      date: formattedDate,
      startTime,
      endTime,
      rate: job.hourly_rate ? `$${job.hourly_rate}/hour` : "$32.50/hour",
      status: job.job_status
        ? job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)
        : undefined,
      raw: job,
    };
  };

  const sortAvailableJobs = (list: AvailableJob[]) =>
    [...list].sort((a, b) => {
      const aStart = a.raw?.start_time || a.raw?.start;
      const bStart = b.raw?.start_time || b.raw?.start;
      const startDiff = new Date(bStart).getTime() - new Date(aStart).getTime();
      if (startDiff !== 0) return startDiff;

      const aEnd = a.raw?.end_time || a.raw?.end;
      const bEnd = b.raw?.end_time || b.raw?.end;
      return new Date(bEnd).getTime() - new Date(aEnd).getTime();
    });

  const fetchAvailableJobs = useCallback(async (page = 1, append = false) => {
    if (isFetchingJobsRef.current) return;
    isFetchingJobsRef.current = true;

    if (page === 1) setLoadingAvailable(true);
    else setLoadingMore(true);

    try {
      const token = await AsyncStorage.getItem("@auth_token");
      const userId = await AsyncStorage.getItem("@user_id");

      if (!token || !userId) {
        throw new Error("Authentication data missing");
      }

      const response = await axios.get(`${BASE_URL}/jobs/available/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const apiResponse = response.data;

      // `data.jobs` IS the paginator: { current_page, data: [...], last_page, total, ... }
      const jobsPaginator = apiResponse?.data?.jobs;
      const jobsArray = jobsPaginator?.data;

      if (!jobsPaginator || !Array.isArray(jobsArray)) {
        throw new Error("Invalid response format");
      }

      const apiJobs = jobsArray;
      const current = Number(jobsPaginator.current_page) || page;
      const last = Number(jobsPaginator.last_page) || 1;
      const total = Number(jobsPaginator.total) || apiJobs.length;

      const formatted = apiJobs.map(mapAvailableJob);

      setAvailableJobs((prev) => {
        const base = append ? prev : [];
        const seen = new Set(base.map((j: AvailableJob) => j.id));
        const merged = [...base];

        formatted.forEach((j: AvailableJob) => {
          if (!seen.has(j.id)) {
            merged.push(j);
            seen.add(j.id);
          }
        });
        return sortAvailableJobs(merged);
      });

      setCurrentPage(current);
      setLastPage(last);
      setTotalJobsCount(total);
      setHasMore(current < last);

      console.log(
        `Loaded ${formatted.length} jobs | Page ${current}/${last} | Total: ${total}`,
      );
    } catch (error: any) {
      console.error("Available jobs error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load available jobs",
        text2: error.message || "Pull down to retry",
      });
    } finally {
      isFetchingJobsRef.current = false;
      if (page === 1) setLoadingAvailable(false);
      else setLoadingMore(false);
    }
  }, []);

  const loadMoreAvailableJobs = useCallback(() => {
    if (loadingMore || loadingAvailable || !hasMore) return;
    fetchAvailableJobs(currentPage + 1, true);
  }, [loadingMore, loadingAvailable, hasMore, currentPage, fetchAvailableJobs]);

  // ─── Fetch accepted shifts ──────────────────────────────────────────────────
  const fetchAcceptedShifts = useCallback(async () => {
    setLoadingToday(true);
    try {
      const todayRes = await postGuardJobs("confirmed", "today");
      setTodayShifts(todayRes?.data?.today || todayRes?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load today's shifts" });
    } finally {
      setLoadingToday(false);
    }

    setLoadingWeek(true);
    try {
      const weekRes = await postGuardJobs("confirmed", "week");
      setWeekShifts(weekRes?.data?.week || weekRes?.data || []);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load week shifts" });
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableJobs();

    // Refresh available jobs count every 30 seconds
    const interval = setInterval(() => {
      fetchAvailableJobs();
    }, 20 * 1000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchAvailableJobs]);

  useFocusEffect(
    useCallback(() => {
      fetchAcceptedShifts();
      fetchAvailableJobs(1, false);
    }, [fetchAcceptedShifts, fetchAvailableJobs]),
  );

  // Kept only as a harmless legacy fallback — App.tsx no longer sends the
  // job via route params (see App.tsx comments), so this effect should
  // normally never fire. checkPendingNotification (below) is the real path.
  useEffect(() => {
    const job = route?.params?.notificationJob;
    if (!job) return;

    console.log("[StaffShifts] Received notification via route params");
    openBottomSheet(job);
    navigation.setParams({ notificationJob: undefined });
  }, [route?.params?.notificationJob, openBottomSheet, navigation]);

  // ─── Check AsyncStorage for a pending ASAP notification ─────────────────
  // Uses the module-level globalIsCheckingPending lock so that if both the
  // "StaffShifts" and "AcceptedJobs" instances of this component happen to
  // check at the same time (e.g. both just focused, or AppState went
  // active), only one of them actually performs the read-then-remove.
  const checkPendingNotification = useCallback(async () => {
    if (globalIsCheckingPending) return;
    globalIsCheckingPending = true;

    try {
      const pending = await AsyncStorage.getItem(PENDING_ASAP_NOTIFICATION_KEY);
      if (!pending) return;

      await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);

      const job = JSON.parse(pending);
      openBottomSheet(job);
    } catch (err) {
      console.error(err);
      await AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY);
    } finally {
      globalIsCheckingPending = false;
    }
  }, [openBottomSheet]);

  useFocusEffect(
    useCallback(() => {
      console.log(
        "[StaffShifts] Screen focused → checking pending notification",
      );

      // Small delay helps avoid race with navigation
      const timer = setTimeout(() => {
        checkPendingNotification();
      }, 150);

      fetchAcceptedShifts();
      fetchAvailableJobs(1, false);

      return () => clearTimeout(timer);
    }, [checkPendingNotification, fetchAcceptedShifts, fetchAvailableJobs]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        checkPendingNotification();
      }
    });
    return () => sub.remove();
  }, [checkPendingNotification]);

  // ─── Sheet close handler ─────────────────────────────────────────────────
  // Fires from BOTH the BottomSheet's `onClose` prop and its `onChange`
  // callback when index === -1. Reads the generation that was tagged onto
  // the close request (by handleAcceptNotification / handleDeclineNotification)
  // and only performs the post-close navigation if that generation is still
  // the current one — i.e. no newer job has taken over the sheet since.
  const handleSheetClose = useCallback(() => {
    console.log("[StaffShifts] Sheet closed");
    const closedGen = closingGenerationRef.current;
    closingGenerationRef.current = null;

    resetNotificationState(closedGen ?? undefined);

    if (
      pendingAcceptSuccessRef.current &&
      closedGen !== null &&
      closedGen === notifGenerationRef.current
    ) {
      pendingAcceptSuccessRef.current = false;
      navigation.navigate("AcceptedJobs");
      fetchAcceptedShifts();
    } else if (closedGen !== notifGenerationRef.current) {
      // Stale close from a previous job — don't navigate/refetch again,
      // a newer job is already in control of the sheet.
      pendingAcceptSuccessRef.current = false;
    }
  }, [resetNotificationState, navigation, fetchAcceptedShifts]);

  const handleAcceptNotification = async () => {
    const jd = extractJobData(notificationJob);
    const rosterId = jd?.id;

    if (!rosterId) {
      Toast.show({ type: "error", text1: "Roster ID is missing" });
      setAcceptingNotification(false);
      return;
    }
    try {
      setAcceptingNotification(true);

      const userJson = await AsyncStorage.getItem("user");
      const currentUser = JSON.parse(userJson || "{}");
      const currentUserId = currentUser?.id;
      const token = await AsyncStorage.getItem("@auth_token");

      if (!currentUserId || !token) throw new Error("Missing auth data");

      const payload: { roster_id: number; guard_id?: number | string } = {
        roster_id: rosterId,
      };

      let acceptUrl = "";
      if (userType === "contractor") {
        acceptUrl = `${BASE_URL}/contractor/jobs/accept/${currentUserId}`;
        payload.guard_id = notifSelectedGuard ?? "";
      } else {
        acceptUrl = `${BASE_URL}/asap-jobs/accept/${currentUserId}`;
      }

      const response = await axios.post(acceptUrl, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      const data = response.data;

      if (data?.success === true) {
        Toast.show({
          type: "success",
          text1: "Success!",
          text2: "Job accepted",
        });
        celebrateJobAccepted();

        // Tag this close request with the job's generation, then request
        // the close. handleSheetClose takes it from here once the sheet
        // actually finishes closing.
        pendingAcceptSuccessRef.current = true;
        closingGenerationRef.current = notifGenerationRef.current;
        setAcceptingNotification(false);
        bottomSheetRef.current?.close();
      } else {
        Toast.show({
          type: "error",
          text1: data?.message || "Failed to accept",
        });
        setAcceptingNotification(false);
      }
    } catch (error: any) {
      console.error("[ACCEPT ERROR]:", error);
      Toast.show({ type: "error", text1: "Failed to accept job" });
      setAcceptingNotification(false);
    }
  };

  const handleDeclineNotification = () => {
    if (acceptingNotification) return; // avoid closing mid-request
    closingGenerationRef.current = notifGenerationRef.current;
    bottomSheetRef.current?.close();
    setSheetOpen(false);
  };

  // ─── "Accept Job" tap in the Available Jobs tab ─────────────────────────
  // Opens the accept sheet (works for both contractor & non-contractor).
  // No staff assignment happens here anymore — no navigation to
  // AsapJobDetails either. The API call happens inside the sheet itself
  // (see handleAcceptSheetSubmit below).
  const handleAcceptJobTap = (job: AvailableJob) => {
    setAcceptSheetJob(job);
    setAcceptSheetSelectedGuard(null);
    setAcceptSheetVisible(true);
  };
  const handleAcceptSheetSubmit = async () => {
    if (!acceptSheetJob) {
      Toast.show({
        type: "error",
        text1: "No job selected",
        position: "top",
      });
      return;
    }

    // Extract roster_id from Available Jobs API response
    const rawJob = acceptSheetJob.raw || acceptSheetJob;
    const rosterId = rawJob?.id || acceptSheetJob?.id;

    console.log("[ACCEPT SHEET] Full Job Object:", rawJob);
    console.log("[ACCEPT SHEET] Extracted roster_id =", rosterId);

    if (!rosterId) {
      Toast.show({
        type: "error",
        text1: "Cannot accept job",
        text2: "Roster ID is missing",
        position: "top",
      });
      return;
    }

    try {
      setAcceptSubmitting(true);

      const userJson = await AsyncStorage.getItem("user");
      if (!userJson) {
        throw new Error("User data not found");
      }

      const currentUser = JSON.parse(userJson);
      const currentUserId = currentUser?.id;
      const userType = currentUser?.user_type?.toLowerCase(); // contractor | staff

      if (!currentUserId) {
        throw new Error("User ID missing");
      }

      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) {
        throw new Error("No auth token");
      }

      const payload: { roster_id: number; guard_id?: number | string } = {
        roster_id: rosterId,
      };

      // Select API based on user type
      let acceptUrl = "";

      if (userType === "contractor") {
        acceptUrl = `${BASE_URL}/contractor/jobs/accept/${currentUserId}`;
        // Optional guard pick from the Accept Job sheet's dropdown — send
        // the id if one was selected, otherwise send an empty value.
        // Staff flow (below) is untouched — this key is only added here.
        payload.guard_id = acceptSheetSelectedGuard ?? "";
      } else if (userType === "staff") {
        acceptUrl = `${BASE_URL}/asap-jobs/accept/${currentUserId}`;
      } else {
        throw new Error(`Unsupported user type: ${userType}`);
      }

      console.log("[ACCEPT AVAILABLE JOB] User Type:", userType);
      console.log("[ACCEPT AVAILABLE JOB] URL:", acceptUrl);
      console.log("[ACCEPT AVAILABLE JOB] Payload:", payload);

      const response = await axios.post(acceptUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const data = response.data;

      if (data?.success === true) {
        Toast.show({
          type: "success",
          text1: "Success!",
          text2: "Job accepted",
          position: "top",
        });

        const acceptedJobId = acceptSheetJob.id;

        // Close sheet
        setAcceptSheetVisible(false);
        setAcceptSheetJob(null);
        setAcceptSheetSelectedGuard(null);
        celebrateJobAccepted();

        // Remove from Available Jobs list
        setAvailableJobs((prev) =>
          prev.filter((j: AvailableJob) => j.id !== acceptedJobId),
        );

        // Refresh accepted shifts either way.
        fetchAcceptedShifts();

        if (userType === "contractor") {
          // Contractor stays on Available Jobs — flip to "Pending
          // Assigning" so they see it waiting to be handed to a guard.
          setContractorAvailableSubTab("Pending Assigning");
        } else {
          // Staffoo staff (and anyone else): the job now lives on the
          // separate "Accepted Job" screen.
          navigation.navigate("AcceptedJobs");
        }
      } else {
        Toast.show({
          type: "error",
          text1: data?.message || "Failed to accept job",
          position: "top",
        });
      }
    } catch (error: any) {
      console.error("[ACCEPT AVAILABLE JOB ERROR]:", error);

      Toast.show({
        type: "error",
        text1: "Failed to accept job",
        text2:
          error?.response?.data?.message ||
          error?.message ||
          "Network/server error",
        position: "top",
      });
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const handleAcceptSheetDecline = () => {
    if (acceptSubmitting) return; // avoid closing mid-request
    setAcceptSheetVisible(false);
    setAcceptSheetJob(null);
    setAcceptSheetSelectedGuard(null);
  };

  const handleRejectJob = (job: AvailableJob) => {
    setAvailableJobs((prev) =>
      prev.filter((j: AvailableJob) => j.id !== job.id),
    );
    Toast.show({ type: "info", text1: "Job Skipped", position: "top" });
  };

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.jobAccepted) {
        const acceptedId = route.params.jobAccepted;
        setAvailableJobs((prev) =>
          prev.filter((j: AvailableJob) => j.id !== acceptedId),
        );
        fetchAcceptedShifts();
        navigation.navigate("AcceptedJobs");
        navigation.setParams({ jobAccepted: undefined });
      }
    }, [route?.params?.jobAccepted]),
  );

  // ─── Assign a staff member to an already-accepted shift (contractor only,
  // driven from the "Accepted" tab). Hits the same endpoint the Accept Job
  // sheet uses for contractors — the contractor's own accept endpoint, with
  // the chosen guard's id sent in the payload. ─────────────────────────────
  const handleAssignStaffToShift = async (
    shift: any,
    staffId: number,
    staffName: string,
  ) => {
    const rosterId = shift?.id;

    if (!rosterId) {
      Toast.show({
        type: "error",
        text1: "Cannot assign staff",
        text2: "Shift ID is missing",
        position: "bottom",
      });
      return;
    }

    try {
      setAssigningStaff(true);

      const userJson = await AsyncStorage.getItem("user");
      if (!userJson) throw new Error("User data not found");
      const currentUser = JSON.parse(userJson);
      const currentUserId = currentUser?.id;
      if (!currentUserId) throw new Error("User ID missing");

      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) throw new Error("No auth token");

      const assignUrl = `${BASE_URL}/contractor/jobs/accept/${currentUserId}`;
      const payload = { roster_id: rosterId, guard_id: staffId };

      console.log("[ASSIGN STAFF] URL:", assignUrl);
      console.log("[ASSIGN STAFF] Payload:", payload);

      const response = await axios.post(assignUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const data = response.data;

      if (data?.success === true) {
        Toast.show({
          type: "success",
          text1: "Staff assigned",
          text2: `Assigned to ${staffName}`,
          position: "bottom",
        });

        setShiftStaffAssignments((prev) => ({
          ...prev,
          [String(rosterId)]: { id: staffId, name: staffName },
        }));

        setShowAssignStaffModal(false);
        setAssignTargetShift(null);
        fetchAcceptedShifts();
      } else {
        Toast.show({
          type: "error",
          text1: data?.message || "Failed to assign staff",
          position: "bottom",
        });
      }
    } catch (error: any) {
      console.error("[ASSIGN STAFF ERROR]:", error);
      Toast.show({
        type: "error",
        text1: "Failed to assign staff",
        text2: error.message || "Network/server error",
        position: "bottom",
      });
    } finally {
      setAssigningStaff(false);
    }
  };

  const closeAssignStaffModal = () => {
    if (assigningStaff) return; // avoid closing mid-request
    setShowAssignStaffModal(false);
    setAssignTargetShift(null);
  };

  // ─── Render: Available job card ─────────────────────────────────────────────
  const renderAvailableCard = ({ item }: { item: AvailableJob }) => (
    <View style={styles.shiftCard}>
      <View style={cardStyles.headerRow}>
        <View style={cardStyles.siteIconWrap}>
          <Briefcase size={14} color={COLORS.primary} />
        </View>
        <Text style={cardStyles.siteNameText} numberOfLines={1}>
          {item.siteName}
        </Text>
        {item.status ? (
          <View style={cardStyles.statusBadge}>
            <Text style={cardStyles.statusBadgeText}>{item.status}</Text>
          </View>
        ) : null}
      </View>

      <View style={cardStyles.divider} />

      <View style={styles.rowItem}>
        <View style={styles.iconBgGrey}>
          <MapPin size={14} color={COLORS.primary} />
        </View>
        <Text style={styles.rowText}>{item.location}</Text>
      </View>

      <View style={styles.rowItem}>
        <View style={styles.iconBgGrey}>
          <CalendarDays size={14} color={COLORS.primary} />
        </View>
        <Text style={styles.rowText}>
          {item.date}
          {"   "}
          <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
            {item.startTime} – {item.endTime}
          </Text>
        </Text>
      </View>

      <View style={styles.rowItem}>
        <View style={styles.iconBgGrey}>
          <FileText size={14} color={COLORS.primary} />
        </View>
        <Text style={styles.addressText} numberOfLines={2}>
          {item.address}
        </Text>
      </View>

      {/* Accept button — opens the accept bottom sheet */}
      <TouchableOpacity
        style={cardStyles.acceptjobButton}
        onPress={() => handleAcceptJobTap(item)}
        activeOpacity={0.8}
      >
        <CheckCircle size={16} color="#fff" />
        <Text style={cardStyles.acceptjobText}>ACCEPT JOB</Text>
      </TouchableOpacity>
    </View>
  );

  // Whether an accepted shift already has a guard assigned — checks a
  // fresh local assignment first, then falls back to the API's `guard`
  // object (singular) / `guard_id` id. Used to split a contractor's
  // accepted shifts into "Accepted Jobs" (assigned) vs "Pending Assigning"
  // (not). Matches the same fields renderShiftCard already reads below.
  const shiftHasAssignedGuard = (shift: any): boolean => {
    const shiftKey = String(shift.id);
    const localAssignment = shiftStaffAssignments[shiftKey];
    const assignedGuardId =
      localAssignment?.id ?? shift.guard?.id ?? shift.guard_id ?? null;
    return !!assignedGuardId;
  };

  // ─── Render: Accepted shift card ────────────────────────────────────────────
  const renderShiftCard = (shift: any, index: number, isToday = false) => {
    const isConfirmed = shift.job_status?.toLowerCase() === "confirmed";
    const signinStatus = Number(shift.signin_status ?? 0);
    let onPress = () =>
      Toast.show({ type: "info", text1: "Action not available" });
    let showButton = false;
    let buttonText = "";
    let buttonVariant: "signIn" | "ongoing" | "upcoming" = "upcoming";
    let disabled = false;

    if (isToday && isConfirmed && signinStatus === 0 && userType == "staff") {
      showButton = true;
      buttonText = "Sign In";
      buttonVariant = "signIn";
      const guardUserId = shift.guard?.user_id ?? shift.user_id;
      const isUserAdmin = Number(guardUserId) === 1;
      let hasMissingDocs = false;
      if (!isUserAdmin && Number(shift.is_document) === 1) {
        hasMissingDocs =
          !userDocuments ||
          userDocuments.length === 0 ||
          userDocuments.some((doc: any) => !doc.file || !doc.document_no);
      }
      if (hasMissingDocs) {
        onPress = () =>
          Toast.show({
            type: "error",
            text1: "Incomplete Profile",
            text2: "Please add your documents first then you can sign-in",
          });
        disabled = true;
      } else {
        onPress = () => navigation.navigate("SignIn", { shift });
      }
    } else if (isToday && isConfirmed && signinStatus === 1) {
      showButton = true;
      buttonText = "Ongoing";
      buttonVariant = "ongoing";
      onPress = () => navigation.navigate("Ongoing", { currentShift: shift });
    } else if (!isToday) {
      showButton = true;
      buttonText = "Upcoming";
      buttonVariant = "upcoming";
      disabled = true;
    }

    const actionBtnStyle =
      buttonVariant === "signIn"
        ? styles.signInButton
        : buttonVariant === "ongoing"
        ? styles.ongoingButton
        : styles.viewButton;
    const actionTextColor =
      buttonVariant === "signIn"
        ? "#92400e"
        : buttonVariant === "ongoing"
        ? COLORS.success
        : COLORS.textMuted;

    // Contractor-only: figure out who (if anyone) this shift is currently
    // assigned to, preferring a fresh local update over whatever the API
    // last told us. Matches shiftHasAssignedGuard's fields above.
    const shiftKey = String(shift.id ?? `${isToday ? "t" : "w"}-${index}`);
    const localAssignment = shiftStaffAssignments[shiftKey];
    const assignedGuardId =
      localAssignment?.id ?? shift.guard?.id ?? shift.guard_id ?? null;
    const assignedStaffName =
      localAssignment?.name || shift.guard?.name || null;
    const isAssigned = !!assignedGuardId;

    return (
      <View key={index} style={styles.shiftCard}>
        <View style={styles.rowBetween}>
          <View style={styles.rowItem}>
            <View style={styles.iconBgGrey}>
              <CalendarDays size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.rowText}>
              {formatDate(shift.start) ||
                `${String(shift.job_start_day || "—").padStart(
                  2,
                  "0",
                )}/${String(shift.job_start_month || "—").padStart(2, "0")}/${
                  shift.job_start_year || "—"
                }`}
            </Text>
          </View>
          <View style={styles.rowItem}>
            <View style={styles.iconBgGrey}>
              <Clock size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.rowText}>
              {formatTime(shift.start)} – {formatTime(shift.end)}
            </Text>
          </View>
        </View>
        <View style={styles.rowItem}>
          <View style={styles.iconBgGrey}>
            <MapPin size={14} color={COLORS.primary} />
          </View>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText} numberOfLines={3}>
              {shift.site?.address || "No address available"}
            </Text>
          </View>
        </View>
        {/* <View style={[styles.rowBetween, { alignItems: "flex-start" }]}>
          <TouchableOpacity
            style={[
              styles.rowItem,
              {
                flex: 1,
                marginRight: 15,
                alignItems: "flex-start",
              },
            ]}
            activeOpacity={1}
          >
            <View style={styles.iconBgGrey}>
              <FileText size={14} color={COLORS.primary} />
            </View>

            <Text
              style={styles.documentText}
              numberOfLines={3} // remove if you want unlimited lines
            >
              {shift.description || "No site description"}
            </Text>
          </TouchableOpacity>

          {showButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPress}
              disabled={disabled}
              style={[
                styles.actionButton,
                actionBtnStyle,
                disabled && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[styles.actionButtonText, { color: actionTextColor }]}
              >
                {buttonText}
              </Text>
            </TouchableOpacity>
          )}
        </View> */}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {/* Description */}
          <View style={{ flex: 0.72 }}>
            <View style={styles.rowItem}>
              <View style={styles.iconBgGrey}>
                <FileText size={14} color={COLORS.primary} />
              </View>

              <Text style={styles.documentText}>
                {shift.description || "No site description"}
              </Text>
            </View>
          </View>

          {/* Button */}
          {showButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPress}
              disabled={disabled}
              style={[
                styles.actionButton,
                actionBtnStyle,
                {
                  width: 100, // adjust as needed
                  alignSelf: "flex-start",
                  marginLeft: 10,
                },
                disabled && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[styles.actionButtonText, { color: actionTextColor }]}
              >
                {buttonText}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Contractor-only: assign this accepted shift to a staff member ── */}
        {userType === "contractor" && (
          <View style={styles.contractorAssignSection}>
            <Text style={styles.assignLabel}>Assign to Staff Member</Text>
            <TouchableOpacity
              style={[
                styles.customDropdown,
                isAssigned && styles.customDropdownAssigned,
              ]}
              activeOpacity={isAssigned ? 1 : 0.8}
              disabled={isAssigned}
              onPress={() => {
                if (isAssigned) return;
                setAssignTargetShift(shift);
                setShowAssignStaffModal(true);
              }}
            >
              <View style={styles.dropdownContent}>
                <UserCheck
                  size={16}
                  color={isAssigned ? COLORS.success : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    isAssigned && {
                      color: COLORS.success,
                      fontWeight: "700",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {capitalizeWords(assignedStaffName) || "Select staff member"}
                </Text>
              </View>
              {isAssigned ? (
                <View style={styles.assignedBadge}>
                  <Text style={styles.assignedBadgeText}>ASSIGNED</Text>
                </View>
              ) : (
                <View style={styles.iconRight}>
                  <ChevronDown size={16} color={COLORS.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─── Render: Load-more footer for the Available Jobs list ──────────────────
  const renderJobsListFooter = () => {
    if (loadingMore) {
      return (
        <View style={cardStyles.footerContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={cardStyles.footerText}>Loading more jobs…</Text>
        </View>
      );
    }
    if (hasMore) {
      return (
        <TouchableOpacity
          style={cardStyles.loadMoreButton}
          onPress={loadMoreAvailableJobs}
          activeOpacity={0.85}
        >
          <Text style={cardStyles.loadMoreButtonText}>
            Load More Jobs
            {totalJobsCount
              ? ` (${availableJobs.length}/${totalJobsCount})`
              : ""}
          </Text>
        </TouchableOpacity>
      );
    }
    if (availableJobs.length > 0) {
      return (
        <View style={cardStyles.footerContainer}>
          <Text style={cardStyles.footerEndText}>
            All {availableJobs.length} jobs loaded
          </Text>
        </View>
      );
    }
    return null;
  };

  // ─── Render tab contents ────────────────────────────────────────────────────
  const renderNewTab = () => {
    if (loadingAvailable && availableJobs.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading available jobs…</Text>
        </View>
      );
    }
    if (availableJobs.length === 0) {
      return (
        <View style={cardStyles.emptyContainer}>
          <View style={cardStyles.emptyIconWrap}>
            <Briefcase size={36} color={COLORS.primary} />
          </View>
          <Text style={cardStyles.emptyText}>No available jobs right now</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={availableJobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAvailableCard}
        contentContainerStyle={{ paddingBottom: 30 }}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderJobsListFooter}
      />
    );
  };
  const capitalizeWords = (text?: string) => {
    if (!text) return "";
    return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };
  const renderAcceptedTab = () => {
    if (loadingToday || loadingWeek) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Shifts…</Text>
        </View>
      );
    }

    // Contractor's "Accepted Jobs" only shows shifts that already have a
    // guard assigned — unassigned ones live under "Pending Assigning" on
    // the Available Jobs screen instead. Staffoo staff / guards see
    // everything, unfiltered, same as before.
    const isContractor = userType === "contractor";
    const shownTodayShifts = isContractor
      ? todayShifts.filter(shiftHasAssignedGuard)
      : todayShifts;
    const shownWeekShifts = isContractor
      ? weekShifts.filter(shiftHasAssignedGuard)
      : weekShifts;

    return (
      <>
        <Text style={styles.sectionHeader}>Today's Shifts</Text>
        {shownTodayShifts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No shifts today</Text>
          </View>
        ) : (
          shownTodayShifts.map((shift, index) =>
            renderShiftCard(shift, index, true),
          )
        )}
        <Text style={styles.sectionHeader}>This Week's Shifts</Text>
        {shownWeekShifts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No shifts this week</Text>
          </View>
        ) : (
          shownWeekShifts.map((shift, index) =>
            renderShiftCard(shift, index, false),
          )
        )}
      </>
    );
  };

  // Contractor-only: accepted shifts that don't have a guard assigned yet.
  const renderPendingAssigningTab = () => {
    if (loadingToday || loadingWeek) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Shifts…</Text>
        </View>
      );
    }

    const pendingToday = todayShifts.filter((s) => !shiftHasAssignedGuard(s));
    const pendingWeek = weekShifts.filter((s) => !shiftHasAssignedGuard(s));

    if (pendingToday.length === 0 && pendingWeek.length === 0) {
      return (
        <View style={cardStyles.emptyContainer}>
          <View style={cardStyles.emptyIconWrap}>
            <Briefcase size={36} color={COLORS.primary} />
          </View>
          <Text style={cardStyles.emptyText}>
            No jobs waiting to be assigned
          </Text>
        </View>
      );
    }

    return (
      <>
        {pendingToday.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Today</Text>
            {pendingToday.map((shift, index) =>
              renderShiftCard(shift, index, true),
            )}
          </>
        )}
        {pendingWeek.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>This Week</Text>
            {pendingWeek.map((shift, index) =>
              renderShiftCard(shift, index, false),
            )}
          </>
        )}
      </>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────────
  const jobData = extractJobData(notificationJob);

  // Required documents for the notification bottom sheet — same source
  // (roster.document_list) and same parsing approach as AsapJobDetails.tsx.
  const notifRequiredDocuments = parseDocumentList(jobData?.document_list);
  const notifHasWorkingWithChildren = notifRequiredDocuments.includes(
    "working_with_children",
  );
  const notifHasWhiteCard = notifRequiredDocuments.includes("white_card");
  const notifDescription: string = jobData?.description || "";

  // Description + required documents for the "Available Jobs" accept sheet,
  // read straight off the raw API job object (same source/shape as the
  // notification sheet above).
  const acceptRawJob = acceptSheetJob?.raw || {};
  const acceptDescription: string = acceptRawJob?.description || "";
  const acceptRequiredDocuments = parseDocumentList(
    acceptRawJob?.document_list,
  );

  const showingAvailableList =
    screenMode === "available" &&
    (userType !== "contractor" ||
      contractorAvailableSubTab === "Available Jobs");

  const isRefreshing = showingAvailableList
    ? loadingAvailable && availableJobs.length === 0
    : loadingToday || loadingWeek;

  const onRefresh = () => {
    if (showingAvailableList) fetchAvailableJobs(1, false);
    else fetchAcceptedShifts();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      {/* Header */}
      <LinearGradient
        colors={[COLORS.heroBg1, COLORS.heroBg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.85}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.initialsAvatar}>
              <Text style={styles.initialsText}>
                {getInitials(user?.name || "User")}
              </Text>
            </View>
          )}

          <View style={styles.welcomeContainer}>
            <Text
              style={styles.greeting}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {capitalizeName(user?.name || "User Name")}
            </Text>
            <Text style={styles.staffName}>Welcome to Staffoo</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>

      {screenMode === "available" &&
        (userType === "contractor" || userType === "staff") && (
          <View style={tabStyles.tabBar}>
            {(
              [
                "Available Jobs",
                userType === "contractor" ? "Pending Assigning" : null,
              ].filter(Boolean) as string[]
            ).map((tab) => {
              const isActive =
                userType === "staff" ? true : contractorAvailableSubTab === tab;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[tabStyles.tab, isActive && tabStyles.tabActive]}
                  onPress={() => {
                    if (userType === "contractor") {
                      setContractorAvailableSubTab(tab as any);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <View style={tabStyles.tabInner}>
                    <Text
                      style={[
                        tabStyles.tabText,
                        isActive && tabStyles.tabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                    {tab === "Available Jobs" && availableJobs.length > 0 && (
                      <View style={tabStyles.badge}>
                        <Text style={tabStyles.badgeText}>
                          {availableJobs.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {screenMode === "accepted"
          ? renderAcceptedTab()
          : userType === "contractor"
          ? contractorAvailableSubTab === "Pending Assigning"
            ? renderPendingAssigningTab()
            : renderNewTab()
          : renderNewTab()}
        {!notificationJob && <View style={styles.placeholder} />}
      </ScrollView>

      {/* ── Accept Sheet — "Available Jobs" tab (contractor + guard) ──
          Shows full job info (description, required documents) for both
          user types. Staff dropdown (showStaffSection) is contractor-only
          and optional — picking a guard sends their id with the accept
          request, leaving it unpicked sends an empty guard_id. Non-
          contractor ("staff") flow is unaffected: showStaffSection is
          false for them, so nothing new renders and nothing new is sent.
          The sheet's own content is now scrollable (see StaffAssignSheet
          above), so long descriptions / document lists / staff lists no
          longer overflow past the visible sheet. */}
      <StaffAssignSheet
        visible={acceptSheetVisible}
        job={acceptSheetJob}
        staffList={contractorStaffList}
        loadingStaff={loadingContractorStaff}
        selectedStaff={acceptSheetSelectedGuard}
        onSelectStaff={setAcceptSheetSelectedGuard}
        onAccept={handleAcceptSheetSubmit}
        onDecline={handleAcceptSheetDecline}
        submitting={acceptSubmitting}
        showStaffSection={userType === "contractor"}
        staffSelectionRequired={false}
        description={acceptDescription}
        requiredDocuments={acceptRequiredDocuments}
      />

      {/* ── ASAP notification bottom sheet ──
          Staff assignment section removed here too — contractors accept
          directly, then assign staff from the "Accepted" tab. Content now
          renders inside BottomSheetScrollView (instead of a plain
          ScrollView nested in BottomSheetView) so it scrolls properly
          within the sheet's gesture handler when there's more data than
          fits — required documents, a longer description, the staff
          picker, etc. */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={!acceptingNotification}
        onClose={handleSheetClose}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        enableDynamicSizing={false}
        android_keyboardInputMode="adjustResize"
        onChange={(index) => {
          if (index === -1) {
            handleSheetClose();
          }
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.7}
            pressBehavior={acceptingNotification ? "none" : "close"}
          />
        )}
      >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.newRequest}>🔔 New Job Request</Text>

          <View style={styles.infoRow}>
            <Calendar size={18} color={COLORS.primary} />

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Date</Text>
              <Text style={styles.infoText}>{formatDate(jobData.start)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color={COLORS.primary} />

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Time</Text>
              <Text style={styles.infoText}>
                {formatTime(jobData.start)} – {formatTime(jobData.end)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={16} color={COLORS.danger} />

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Location</Text>
              <Text style={styles.addressInSheet} numberOfLines={4}>
                {jobData?.site?.address ||
                  jobData?.address ||
                  "No address available"}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <FileText size={16} color={COLORS.primary} />

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Site Description</Text>
              <Text style={styles.infoText}>
                {jobData?.description ??
                  jobData?.site?.description ??
                  "No site description"}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Clock size={16} color={COLORS.primary} />

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Total Hours</Text>
              <Text style={styles.infoText}>{jobData?.hours ?? "—"}</Text>
            </View>
          </View>

          {/* ── Required Documents ── */}
          {(notifHasWorkingWithChildren || notifHasWhiteCard) && (
            <View style={styles.documentsSection}>
              <Text style={styles.documentsSectionTitle}>
                Required Documents
              </Text>

              {notifHasWorkingWithChildren && (
                <View style={styles.documentRow}>
                  <Text style={styles.documentLabel}>
                    Working with Children Check Required
                  </Text>
                  <Text style={styles.documentYes}>YES</Text>
                </View>
              )}

              {notifHasWhiteCard && (
                <View style={[styles.documentRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.documentLabel}>White Card Required</Text>
                  <Text style={styles.documentYes}>YES</Text>
                </View>
              )}
            </View>
          )}

          {/* Contractor-only, optional guard pick — mirrors the Accept
              Job sheet's dropdown. Picking a guard sends their id with
              the accept request; leaving it unpicked sends none. Staff
              flow (non-contractor) is unaffected: nothing renders here
              for them and nothing extra is sent. */}
          {userType === "contractor" && (
            <View style={{ marginVertical: 5 }}>
              <Text style={styles.assignLabel}>
                Assign to Staff Member (optional)
              </Text>
              {loadingContractorStaff ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : contractorStaffList.length === 0 ? (
                <Text style={{ color: COLORS.danger, padding: 10 }}>
                  No staff available
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.customDropdown}
                    onPress={() => setShowNotifGuardModal(true)}
                    activeOpacity={0.8}
                    disabled={acceptingNotification}
                  >
                    <View style={styles.dropdownContent}>
                      <UserCheck size={18} color={COLORS.primary} />
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {notifSelectedGuard
                          ? capitalizeWords(
                              contractorStaffList.find(
                                (s) => s.id === notifSelectedGuard,
                              )?.name,
                            ) || `Staff #${notifSelectedGuard}`
                          : "Select staff member"}
                      </Text>
                    </View>
                    <View style={styles.iconRight}>
                      <ChevronDown size={18} color={COLORS.textMuted} />
                    </View>
                  </TouchableOpacity>

                  <Modal
                    visible={showNotifGuardModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowNotifGuardModal(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.dropdownModal}>
                        <Text style={styles.modalTitle}>Select Staff</Text>
                        <FlatList
                          data={contractorStaffList}
                          keyExtractor={(item) => item.id.toString()}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.staffItem}
                              onPress={() => {
                                setNotifSelectedGuard(item.id);
                                setShowNotifGuardModal(false);
                              }}
                            >
                              <Text style={styles.staffNameText}>
                                {capitalizeWords(item.name) ||
                                  item.email ||
                                  `Staff #${item.id}`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                        <TouchableOpacity
                          style={styles.cancelButtonModal}
                          onPress={() => setShowNotifGuardModal(false)}
                        >
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                </>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                acceptingNotification && styles.disabledButton,
              ]}
              disabled={acceptingNotification}
              onPress={handleAcceptNotification}
            >
              {acceptingNotification ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.buttonText}>ACCEPT</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.declineButton,
                acceptingNotification && styles.disabledButton,
              ]}
              onPress={handleDeclineNotification}
              disabled={acceptingNotification}
            >
              <XCircle size={16} color="#fff" />
              <Text style={styles.buttonText}>DECLINE</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* ── Assign-to-staff modal — Accepted tab, contractor only ── */}
      <Modal
        visible={showAssignStaffModal}
        transparent
        animationType="fade"
        onRequestClose={closeAssignStaffModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModal}>
            <Text style={styles.modalTitle}>Assign to Staff</Text>

            {loadingContractorStaff ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : contractorStaffList.length === 0 ? (
              <Text
                style={{
                  color: COLORS.danger,
                  padding: 10,
                  textAlign: "center",
                }}
              >
                No staff available
              </Text>
            ) : (
              <FlatList
                data={contractorStaffList}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.staffItem}
                    disabled={assigningStaff}
                    onPress={() =>
                      handleAssignStaffToShift(
                        assignTargetShift,
                        item.id,
                        item.name || item.email || `Staff #${item.id}`,
                      )
                    }
                  >
                    <Text style={styles.staffNameText}>
                      {capitalizeWords(item.name) ||
                        capitalizeWords(item.email) ||
                        `Staff #${item.id}`}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.cancelButtonModal}
              onPress={closeAssignStaffModal}
              disabled={assigningStaff}
            >
              {assigningStaff ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.cancelText}>Cancel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Job-accepted celebration — full screen, confetti + sound +
          vibration, triggered from the accept sheet and the ASAP
          notification sheet's success handlers. Auto-hides itself. ── */}
      <JobAcceptedCelebration
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
      />

      {/* <BottomTab navigation={navigation} activeTab="StaffShifts" /> */}
    </SafeAreaView>
  );
}

// ─── Accept Sheet Styles ───────────────────────────────────────────────────────
const assignStyles = StyleSheet.create({
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
    flex: 1, // <--- Ensures this container takes only available space
    marginRight: 8,
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
const tabStyles = StyleSheet.create({
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
const cardStyles = StyleSheet.create({
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
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

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

  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
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
  headerGradient: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    marginLeft: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    flexShrink: 1,
  },
  staffName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
