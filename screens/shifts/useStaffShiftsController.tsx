
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  AppState,
  AppStateStatus,
  Vibration,
} from "react-native";
import {
  ChevronDown,
  UserCheck,
  CheckCircle,
  Briefcase,
} from "lucide-react-native";
import { Clock, MapPin, FileText, CalendarDays } from "lucide-react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { playSound } from "../../utils/soundPlayer";
import Toast from "react-native-toast-message";
import {
  getUserProfile,
  getContractorStaff,
  postGuardJobs,
  BASE_URL,
} from "../../services/authApi";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { PENDING_ASAP_NOTIFICATION_KEY } from "../../App";
import { subscribeToPendingNotifications } from "../../utils/notificationBus";
import {
  AvailableJob,
  COLORS,
  JOBS_PAGE_SIZE,
  formatDate,
  formatTime,
  getNotifKey,
  parseDocumentList,
  extractJobData,
  styles,
  cardStyles,
} from "./StaffShiftsShared";

let globalLastHandledNotifKey: string | null = null;
let globalIsCheckingPending = false;

export function useStaffShiftsController(
  navigation: any,
  route: any,
  screenMode: "accepted" | "available",
) {
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
              // `https://apis-staging.staffoo.com.au/storage/${parsedUser.staff.profile_image}`,
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

    // Not logged in (or just logged out) — this fetch runs on a 20s
    // interval and on every focus event regardless of auth state, so
    // treat "no token" as a normal, silent no-op rather than an error.
    // Without this, a logout that happens to land between clearing
    // AsyncStorage and this screen actually unmounting would surface an
    // alarming "Authentication data missing" toast for no real reason.
    const token = await AsyncStorage.getItem("@auth_token");
    const userId = await AsyncStorage.getItem("@user_id");
    if (!token || !userId) return;

    isFetchingJobsRef.current = true;

    if (page === 1) setLoadingAvailable(true);
    else setLoadingMore(true);

    try {
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
    // Same reasoning as fetchAvailableJobs above — this also runs on every
    // focus event and AppState "active", regardless of login state.
    const token = await AsyncStorage.getItem("@auth_token");
    if (!token) return;

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
  // App.tsx always navigates to "StaffShifts" (screenMode === "available")
  // for ASAP notifications — never "AcceptedJobs" — so only that instance
  // should ever attempt to consume a pending payload. Both screens mount
  // this hook, and AppState/the notification bus fire in every mounted
  // instance regardless of which tab is actually active; without this
  // guard, whichever instance's check happens to run first "wins" the
  // globalIsCheckingPending lock and opens ITS OWN bottom sheet — which,
  // if that's the Accepted Jobs instance, opens invisibly in a
  // not-currently-visible tab (this component renders its BottomSheet
  // inline, not as a root-level portal). Gating on screenMode here means
  // there's no race left to lose: the wrong instance simply never tries.
  const checkPendingNotification = useCallback(async () => {
    if (screenMode !== "available") return;
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
  }, [openBottomSheet, screenMode]);

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

  // Direct wake-up from App.tsx — covers the case where this screen is
  // ALREADY focused when a notification is tapped, so navigating to it
  // doesn't produce a new focus event for useFocusEffect to catch.
  useEffect(() => {
    const unsubscribe = subscribeToPendingNotifications(() => {
      checkPendingNotification();
    });
    return unsubscribe;
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

      // Same rule as handleAcceptSheetSubmit's post-accept redirect: a
      // contractor who accepted WITHOUT picking a guard from the
      // notification sheet's dropdown still needs to hand the job to a
      // guard, so send them to Available Jobs → "Pending Assigning"
      // instead of Accepted Jobs. Picking a guard (or being staff, who
      // never sees that dropdown) keeps the existing behaviour.
      if (userType === "contractor" && !notifSelectedGuard) {
        setContractorAvailableSubTab("Pending Assigning");
        navigation.navigate("StaffShifts");
      } else {
        navigation.navigate("AcceptedJobs");
      }
      fetchAcceptedShifts();
    } else if (closedGen !== notifGenerationRef.current) {
      // Stale close from a previous job — don't navigate/refetch again,
      // a newer job is already in control of the sheet.
      pendingAcceptSuccessRef.current = false;
    }
  }, [
    resetNotificationState,
    navigation,
    fetchAcceptedShifts,
    userType,
    notifSelectedGuard,
    setContractorAvailableSubTab,
  ]);

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

  // Count for the "Pending Assigning" tab badge — same "no guard assigned
  // yet" filter used inside renderPendingAssigningTab, just exposed as a
  // number so the tab bar (in AvailableJobsScreen/AcceptedJobsScreen) can
  // show it next to the tab, mirroring the "Available Jobs" badge.
  const pendingAssigningCount =
    todayShifts.filter((s) => !shiftHasAssignedGuard(s)).length +
    weekShifts.filter((s) => !shiftHasAssignedGuard(s)).length;

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

  return {
    screenMode,

    // refs
    bottomSheetRef,
    snapPoints,

    // available jobs
    availableJobs,
    loadingAvailable,
    loadingMore,
    hasMore,
    totalJobsCount,
    fetchAvailableJobs,
    loadMoreAvailableJobs,

    // accepted / pending shifts
    todayShifts,
    weekShifts,
    loadingToday,
    loadingWeek,
    fetchAcceptedShifts,
    shiftStaffAssignments,

    // user / profile
    userType,
    userId,
    isStaffooStaff,
    user,
    profileImage,
    loadingProfile,
    userDocuments,

    // contractor "Available Jobs" vs "Pending Assigning" sub-tab
    contractorAvailableSubTab,
    setContractorAvailableSubTab,

    // ASAP notification bottom sheet
    notificationJob,
    sheetOpen,
    acceptingNotification,
    notifSelectedGuard,
    setNotifSelectedGuard,
    showNotifGuardModal,
    setShowNotifGuardModal,
    handleSheetClose,
    handleAcceptNotification,
    handleDeclineNotification,

    // "Available Jobs" accept sheet
    acceptSheetJob,
    acceptSheetVisible,
    acceptSubmitting,
    acceptSheetSelectedGuard,
    setAcceptSheetSelectedGuard,
    handleAcceptJobTap,
    handleAcceptSheetSubmit,
    handleAcceptSheetDecline,
    handleRejectJob,

    // contractor staff list + assign-to-staff modal (Accepted tab)
    contractorStaffList,
    loadingContractorStaff,
    assignTargetShift,
    showAssignStaffModal,
    setShowAssignStaffModal,
    setAssignTargetShift,
    assigningStaff,
    handleAssignStaffToShift,
    closeAssignStaffModal,
    shiftHasAssignedGuard,

    // celebration overlay
    showCelebration,
    setShowCelebration,

    // render helpers
    renderAvailableCard,
    renderShiftCard,
    renderJobsListFooter,
    renderNewTab,
    renderAcceptedTab,
    renderPendingAssigningTab,
    pendingAssigningCount,
    capitalizeWords,

    // notification sheet derived data
    jobData,
    notifRequiredDocuments,
    notifHasWorkingWithChildren,
    notifHasWhiteCard,
    notifDescription,

    // accept sheet derived data
    acceptRawJob,
    acceptDescription,
    acceptRequiredDocuments,

    // refresh
    showingAvailableList,
    isRefreshing,
    onRefresh,
  };
}
