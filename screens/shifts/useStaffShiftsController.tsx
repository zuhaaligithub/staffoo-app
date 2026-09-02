import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
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
  formatDate,
  formatTime,
  getNotifKey,
  parseDocumentList,
  extractJobData,
  styles,
  cardStyles,
} from "./StaffShiftsShared";
import BrandLoader from "../BrandLoader";

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
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notificationJob, setNotificationJob] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [acceptingNotification, setAcceptingNotification] = useState(false);
  const lastHandledNotifKeyRef = useRef<string | null>(null);
  const isSheetReadyRef = useRef(false);
  const notifGenerationRef = useRef(0);
  const closingGenerationRef = useRef<number | null>(null);
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
  const [showAcceptSuccessModal, setShowAcceptSuccessModal] = useState(false);
  const acceptSuccessTimerRef = useRef<any>(null);
  const hideAcceptSuccessModal = useCallback(() => {
    if (acceptSuccessTimerRef.current) {
      clearTimeout(acceptSuccessTimerRef.current);
      acceptSuccessTimerRef.current = null;
    }
    setShowAcceptSuccessModal(false);
  }, []);
  const [acceptSheetSelectedGuard, setAcceptSheetSelectedGuard] = useState<
    number | null
  >(null);
  const [notifSelectedGuard, setNotifSelectedGuard] = useState<number | null>(
    null,
  );
  const [showNotifGuardModal, setShowNotifGuardModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalJobsCount, setTotalJobsCount] = useState<number | null>(null);
  const isFetchingJobsRef = useRef(false);
  const [contractorStaffList, setContractorStaffList] = useState<any[]>([]);
  const [loadingContractorStaff, setLoadingContractorStaff] = useState(false);
  const [assignTargetShift, setAssignTargetShift] = useState<any>(null);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [shiftStaffAssignments, setShiftStaffAssignments] = useState<
    Record<string, { id: number; name: string }>
  >({});

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
              // `https://apis.staffoo.com.au/storage/${parsedUser.staff.profile_image}`,
              `https://apis-staging.staffoo.com.au/storage/${parsedUser.staff.profile_image}`,
            );
          }
        }
      } catch (e) {
        console.log("User load error", e);
      }
    };
    loadUser();
  }, []);

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
    AsyncStorage.removeItem(PENDING_ASAP_NOTIFICATION_KEY).catch(() => {});
    setTimeout(() => {
      bottomSheetRef.current?.close?.();
    }, 100);
  }, []);

  const fetchAcceptedShifts = useCallback(async () => {
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

  const getContractorInvoiceValue = (job: any): number => {
    const raw = job?.raw || job;
    const resolved = extractJobData(raw);
    const invoice =
      resolved?.contractor_invoice ??
      raw?.contractor_invoice ??
      job?.contractor_invoice ??
      0;
    return Number(invoice || 0);
  };

  const getShiftContractorInvoiceValue = (shift: any): number => {
    if (!shift) return 0;
    const candidates = [
      shift,
      shift?.raw,
      shift?.roster,
      shift?.job,
      typeof extractJobData === "function" ? extractJobData(shift) : null,
      typeof extractJobData === "function" ? extractJobData(shift?.raw) : null,
      typeof extractJobData === "function" ? extractJobData(shift?.job) : null,
    ].filter(Boolean);

    for (const c of candidates) {
      const val =
        c?.contractor_invoice ??
        c?.raw?.contractor_invoice ??
        c?.roster?.contractor_invoice;
      if (val !== undefined && val !== null && val !== "") {
        return Number(val);
      }
    }
    return 0;
  };

  const parseShiftDateMs = (raw: any): number => {
    if (raw == null || raw === "") return NaN;
    if (typeof raw === "number") return raw;
    const s = String(raw).trim();
    // Try the DD-MM-YYYY (with optional time) format FIRST. Native `new Date()`
    // parsing of non-ISO strings is implementation-defined and can silently
    // misinterpret "DD-MM-YYYY" as "MM-DD-YYYY" on some engines (e.g. Hermes)
    // when DD <= 12, corrupting the computed shift duration without ever
    // throwing/returning NaN. Checking the known API format first avoids that.
    const m = s.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );
    if (m) {
      const [, dd, mm, yyyy, hh = "0", min = "0", sec = "0"] = m;
      const ms = new Date(
        `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(
          2,
          "0",
        )}:${min}:${sec}`,
      ).getTime();
      if (!isNaN(ms)) return ms;
    }
    // Fall back to native parsing for ISO strings / anything else.
    const ms = new Date(s).getTime();
    return ms;
  };

  // Resolves a shift/job item to a flat object of the fields we care about
  // (contractor_invoice, job_status, start, end, hours) regardless of how
  // deeply the API nested them (top-level, .raw, .roster, .job, or inside
  // whatever extractJobData() knows how to unwrap). Today's and Week's
  // endpoints have been observed to nest fields slightly differently, so
  // every lookup below checks all known shapes instead of just the top level.
  const resolveShiftFields = (item: any) => {
    if (!item) return null;
    const jd =
      typeof extractJobData === "function" ? extractJobData(item) : null;
    const jdRaw =
      typeof extractJobData === "function" ? extractJobData(item?.raw) : null;
    const jdJob =
      typeof extractJobData === "function" ? extractJobData(item?.job) : null;
    const jdRoster =
      typeof extractJobData === "function"
        ? extractJobData(item?.roster)
        : null;

    const sources = [
      item,
      item?.raw,
      item?.roster,
      item?.job,
      jd,
      jdRaw,
      jdJob,
      jdRoster,
    ].filter(Boolean);

    const pick = (...keys: string[]) => {
      for (const src of sources) {
        for (const key of keys) {
          const val = src?.[key];
          if (val !== undefined && val !== null && val !== "") return val;
        }
      }
      return undefined;
    };

    return {
      contractor_invoice: pick("contractor_invoice"),
      job_status: pick("job_status", "status"),
      start: pick("start", "start_time"),
      end: pick("end", "end_time"),
      hours: pick("hours", "total_hours", "job_hours"),
    };
  };

  const getShiftDurationHours = (shift: any): number => {
    const startRaw = shift?.start || shift?.start_time;
    const endRaw = shift?.end || shift?.end_time;
    if (startRaw && endRaw) {
      const startMs = parseShiftDateMs(startRaw);
      const endMs = parseShiftDateMs(endRaw);
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        return (endMs - startMs) / (1000 * 60 * 60);
      }
    }

    const fallbackHours = Number(
      shift?.hours ?? shift?.total_hours ?? shift?.job_hours ?? 0,
    );
    return fallbackHours || 0;
  };

  const computeHideAssignDropdown = (item: any): boolean => {
    if (!item) return true; // nothing to show
    const fields = resolveShiftFields(item);
    if (!fields) return true;

    const invoice = Number(fields.contractor_invoice ?? 0);
    if (invoice === 1) return false;

    const status = String(fields.job_status ?? "")
      .toLowerCase()
      .trim();
    const duration = getShiftDurationHours(item);
    if (invoice === 0 && status === "confirmed" && duration < 12) {
      return false; // show
    }
    return true; // hide
  };

  const acceptContractorJob = async (
    job: any,
    guardId?: number | null,
  ): Promise<any> => {
    const rawJob = job?.raw || job;
    const rosterId = rawJob?.id || job?.id;
    if (!rosterId) throw new Error("Roster ID is missing");
    const userJson = await AsyncStorage.getItem("user");
    if (!userJson) throw new Error("User data not found");
    const currentUser = JSON.parse(userJson);
    const currentUserId = currentUser?.id;
    if (!currentUserId) throw new Error("User ID missing");
    const token = await AsyncStorage.getItem("@auth_token");
    if (!token) throw new Error("No auth token");
    const payload: { roster_id: number; guard_id?: string } = {
      roster_id: rosterId,
    };
    if (guardId !== undefined)
      payload.guard_id = guardId ? String(guardId) : "";

    const acceptUrl = `${BASE_URL}/contractor/jobs/accept/${currentUserId}`;
    const response = await axios.post(acceptUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    return response.data;
  };

  const openBottomSheet = useCallback((job: any) => {
    if (!job) return;
    const jd = extractJobData(job);
    if (!jd?.id) {
      console.warn(
        "[StaffShifts] Ignoring notification with no resolvable job id",
      );
      return;
    }
    const key = getNotifKey(job);
    if (globalLastHandledNotifKey === key) {
      console.log("[StaffShifts] Duplicate notification - skipping");
      return;
    }
    console.log("[StaffShifts] Opening BottomSheet for job:", key);
    globalLastHandledNotifKey = key;
    lastHandledNotifKeyRef.current = key;
    notifGenerationRef.current += 1;
    closingGenerationRef.current = null;
    isSheetReadyRef.current = false;
    setAcceptingNotification(false);
    setNotifSelectedGuard(null);
    setNotificationJob(job);
    setSheetOpen(true);
  }, []);

  useEffect(() => {
    if (!sheetOpen || !notificationJob) return;
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

  useFocusEffect(
    useCallback(() => {
      const loadContractorStaff = async () => {
        try {
          const userJson = await AsyncStorage.getItem("user");
          if (!userJson) return;

          const currentUser = JSON.parse(userJson);
          const currentUserId = Number(currentUser?.id);
          const currentUserType = (currentUser?.user_type || "")
            .trim()
            .toLowerCase();

          if (currentUserType !== "contractor" || !currentUserId) {
            return;
          }

          console.log(
            "[StaffShifts] Calling getContractorStaff immediately:",
            currentUserId,
          );

          setLoadingContractorStaff(true);

          const res = await getContractorStaff(currentUserId);

          setContractorStaffList(res?.guards?.length ? res.guards : []);
        } catch (error) {
          console.error("[Contractor Staff Load Error]:", error);
          setContractorStaffList([]);
        } finally {
          setLoadingContractorStaff(false);
        }
      };

      loadContractorStaff();
    }, []),
  );

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

  const fetchAvailableJobs = useCallback(async (page = 1, append = false) => {
    if (isFetchingJobsRef.current) return;
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
        if (append) {
          const seen = new Set(prev.map((j: AvailableJob) => j.id));
          const merged = [...prev];
          formatted.forEach((j: AvailableJob) => {
            if (!seen.has(j.id)) {
              merged.push(j);
              seen.add(j.id);
            }
          });
          return merged;
        }
        if (prev.length === 0) {
          return formatted;
        }
        const same =
          prev.length === formatted.length &&
          prev.every((oldJob, index) => {
            const newJob = formatted[index];

            return (
              oldJob.id === newJob.id &&
              oldJob.status === newJob.status &&
              oldJob.date === newJob.date &&
              oldJob.startTime === newJob.startTime &&
              oldJob.endTime === newJob.endTime
            );
          });
        if (same) {
          return prev;
        }
        return formatted;
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

  useEffect(() => {
    fetchAvailableJobs();
    const interval = setInterval(() => {
      fetchAvailableJobs();
    }, 20 * 1000);
    return () => clearInterval(interval);
  }, [fetchAvailableJobs]);

  useFocusEffect(
    useCallback(() => {
      fetchAcceptedShifts();
      fetchAvailableJobs(1, false);
    }, [fetchAcceptedShifts, fetchAvailableJobs]),
  );

  useEffect(() => {
    const job = route?.params?.notificationJob;
    if (!job) return;
    console.log("[StaffShifts] Received notification via route params");
    openBottomSheet(job);
    navigation.setParams({ notificationJob: undefined });
  }, [route?.params?.notificationJob, openBottomSheet, navigation]);

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

  useEffect(() => {
    const unsubscribe = subscribeToPendingNotifications(() => {
      checkPendingNotification();
    });
    return unsubscribe;
  }, [checkPendingNotification]);

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

  const handleAcceptJobTap = async (job: AvailableJob) => {
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
      let acceptUrl = "";
      if (userType === "contractor") {
        acceptUrl = `${BASE_URL}/contractor/jobs/accept/${currentUserId}`;
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
        setAcceptSheetVisible(false);
        setAcceptSheetJob(null);
        setAcceptSheetSelectedGuard(null);
        celebrateJobAccepted();
        setAvailableJobs((prev) =>
          prev.filter((j: AvailableJob) => j.id !== acceptedJobId),
        );

        fetchAcceptedShifts();
        try {
          const invoiceVal = getContractorInvoiceValue(acceptSheetJob);
          if (invoiceVal === 0 && userType === "contractor") {
            setShowAcceptSuccessModal(true);
            acceptSuccessTimerRef.current = setTimeout(() => {
              setShowAcceptSuccessModal(false);
              acceptSuccessTimerRef.current = null;
              navigation.navigate("AcceptedJobs");
            }, 60000);
          } else {
            navigation.navigate("AcceptedJobs");
          }
        } catch (e) {
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
    if (acceptSubmitting) return;
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

  const shiftHasAssignedGuard = (shift: any): boolean => {
    const shiftKey = String(shift.id);
    const localAssignment = shiftStaffAssignments[shiftKey];
    const assignedGuardId =
      localAssignment?.id ?? shift.guard?.id ?? shift.guard_id ?? null;
    return !!assignedGuardId;
  };

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

      // Profile is active → never disable the button & never show docs toast
      const isProfileActive =
        user?.is_active === true ||
        user?.is_active === 1 ||
        user?.is_active === "1";

      const guardUserId = shift.guard?.user_id ?? shift.user_id;
      const isUserAdmin = Number(guardUserId) === 1;

      let hasMissingDocs = false;
      if (!isUserAdmin && Number(shift.is_document) === 1) {
        hasMissingDocs =
          !userDocuments ||
          userDocuments.length === 0 ||
          userDocuments.some((doc: any) => !doc.file || !doc.document_no);
      }

      // Only disable + show error toast when profile is NOT active AND docs are missing
      if (!isProfileActive && hasMissingDocs) {
        disabled = true;
        onPress = () =>
          Toast.show({
            type: "error",
            text1: "Incomplete Profile",
            text2: "Please add your documents first then you can sign-in",
            position: "top",
          });
      } else {
        // is_active === true  →  button enabled, no toast, just navigate
        disabled = false;
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

    const sectionKey = isToday ? "today" : "week";
    const shiftKey = String(shift.id ?? `${sectionKey}-${index}`);
    const uniqueCardKey = `${sectionKey}-${shiftKey}`;
    const localAssignment = shiftStaffAssignments[shiftKey];
    const assignedGuardId =
      localAssignment?.id ?? shift.guard?.id ?? shift.guard_id ?? null;
    const assignedStaffName =
      localAssignment?.name || shift.guard?.name || null;
    const isAssigned = !!assignedGuardId;
    const hideAssignForContractor = computeHideAssignDropdown(shift);

    // Status badge label
    const fields = resolveShiftFields(shift);
    const invoiceVal = Number(fields?.contractor_invoice ?? 0);
    const statusRaw = String(fields?.job_status ?? shift.job_status ?? "")
      .toLowerCase()
      .trim();
    const durationHrs = getShiftDurationHours(shift);

    let shiftStatusLabel: string | null = null;
    if (statusRaw) {
      if (invoiceVal === 0 && statusRaw === "pending" && durationHrs < 12) {
        shiftStatusLabel = "Job Assigned — Payment Pending";
      } else {
        shiftStatusLabel =
          statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
      }
    }

    return (
      <View key={uniqueCardKey} style={styles.shiftCard}>
        {userType === "contractor" && shiftStatusLabel ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginBottom: 6,
            }}
          >
            <View
              style={[
                cardStyles.statusBadge,
                isConfirmed && {
                  backgroundColor: "#DCFCE7",
                  borderColor: "#86EFAC",
                },
              ]}
            >
              <Text
                style={[
                  cardStyles.statusBadgeText,
                  isConfirmed && {
                    color: "#16A34A",
                  },
                ]}
              >
                {shiftStatusLabel}
              </Text>
            </View>
          </View>
        ) : null}

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

          {showButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPress}
              disabled={disabled}
              style={[
                styles.actionButton,
                actionBtnStyle,
                {
                  width: 100,
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

        {userType === "contractor" && !hideAssignForContractor && (
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

  const renderJobsListFooter = () => {
    if (loadingMore) {
      return (
        <View style={cardStyles.footerContainer}>
          <BrandLoader size={28} />
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

  const renderNewTab = () => {
    if (loadingAvailable && availableJobs.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <BrandLoader size={60} />
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
          <BrandLoader size={60} />
          <Text style={styles.loadingText}>Loading Shifts…</Text>
        </View>
      );
    }
    return (
      <>
        <Text style={styles.sectionHeader}>Today's Shifts</Text>
        {todayShifts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No shifts today</Text>
          </View>
        ) : (
          todayShifts.map((shift, index) => renderShiftCard(shift, index, true))
        )}
        <Text style={styles.sectionHeader}>This Week's Shifts</Text>
        {weekShifts.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No shifts this week</Text>
          </View>
        ) : (
          weekShifts.map((shift, index) => renderShiftCard(shift, index, false))
        )}
      </>
    );
  };

  const jobData = extractJobData(notificationJob);
  const notifRequiredDocuments = parseDocumentList(jobData?.document_list);
  const notifHasWorkingWithChildren = notifRequiredDocuments.includes(
    "working_with_children",
  );
  const notifHasWhiteCard = notifRequiredDocuments.includes("white_card");
  const notifDescription: string = jobData?.description || "";
  const notifShiftDurationHours = getShiftDurationHours(jobData);
  const notifHideAssignForContractor = computeHideAssignDropdown(jobData);
  const acceptRawJob = acceptSheetJob?.raw || {};
  const acceptDescription: string = acceptRawJob?.description || "";
  const acceptRequiredDocuments = parseDocumentList(
    acceptRawJob?.document_list,
  );
  const acceptShiftDurationHours = getShiftDurationHours(acceptRawJob);
  const acceptHideAssignForContractor = computeHideAssignDropdown(acceptRawJob);
  const showingAvailableList = screenMode === "available";
  const isRefreshing = showingAvailableList
    ? loadingAvailable && availableJobs.length === 0
    : loadingToday || loadingWeek;

  const onRefresh = () => {
    if (showingAvailableList) fetchAvailableJobs(1, false);
    else fetchAcceptedShifts();
  };

  useEffect(() => {
    return () => {
      if (acceptSuccessTimerRef.current) {
        clearTimeout(acceptSuccessTimerRef.current);
        acceptSuccessTimerRef.current = null;
      }
    };
  }, []);

  return {
    screenMode,
    bottomSheetRef,
    snapPoints,
    availableJobs,
    loadingAvailable,
    loadingMore,
    hasMore,
    totalJobsCount,
    fetchAvailableJobs,
    loadMoreAvailableJobs,
    todayShifts,
    weekShifts,
    loadingToday,
    loadingWeek,
    fetchAcceptedShifts,
    shiftStaffAssignments,
    userType,
    userId,
    isStaffooStaff,
    user,
    profileImage,
    loadingProfile,
    userDocuments,
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
    acceptSheetJob,
    acceptSheetVisible,
    acceptSubmitting,
    acceptSheetSelectedGuard,
    setAcceptSheetSelectedGuard,
    handleAcceptJobTap,
    handleAcceptSheetSubmit,
    handleAcceptSheetDecline,
    handleRejectJob,
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
    showCelebration,
    setShowCelebration,
    showAcceptSuccessModal,
    hideAcceptSuccessModal,
    renderAvailableCard,
    renderShiftCard,
    renderJobsListFooter,
    renderNewTab,
    renderAcceptedTab,
    capitalizeWords,
    jobData,
    notifRequiredDocuments,
    notifHasWorkingWithChildren,
    notifHasWhiteCard,
    notifDescription,
    notifHideAssignForContractor,
    acceptRawJob,
    acceptDescription,
    acceptRequiredDocuments,
    acceptHideAssignForContractor,
    showingAvailableList,
    isRefreshing,
    onRefresh,
  };
}
