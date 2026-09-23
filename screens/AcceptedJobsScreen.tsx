



import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from "react-native";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  ChevronDown,
  UserCheck,
  ChevronLeft,
  Layers,
  CalendarDays,
} from "lucide-react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import JobAcceptedCelebration from "./JobAcceptedCelebration";
import {
  COLORS,
  capitalizeName,
  formatDate,
  formatTime,
  StaffAssignSheet,
  styles,
  assignStyles,
  IconBadge,
  StatusPill,
  GradientButton,
} from "./shifts/StaffShiftsShared";
import { useStaffShiftsController } from "./shifts/useStaffShiftsController";

type Props = { navigation: any; route: any };

export default function AcceptedJobsScreen({ navigation, route }: Props) {
  const formatHoursLabel = (
    hours: number | string | null | undefined,
  ): string => {
    const n = typeof hours === "string" ? parseFloat(hours) : Number(hours);
    if (!n || isNaN(n) || n <= 0) return "—";

    const totalMinutes = Math.round(n * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m} minute${m === 1 ? "" : "s"}`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m} minute${m === 1 ? "" : "s"}`;
  };

  /** Prefer API hours; otherwise derive from start/end (handles overnight). */
  const getJobHoursLabel = (job: any): string => {
    if (!job) return "—";

    const apiHours = job?.hours ?? job?.total_hours ?? job?.job_hours;
    if (apiHours != null && apiHours !== "" && !isNaN(Number(apiHours))) {
      return formatHoursLabel(apiHours);
    }

    const startRaw = job?.start || job?.start_time;
    const endRaw = job?.end || job?.end_time;
    if (!startRaw || !endRaw) return "—";

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "—";

    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // overnight

    return formatHoursLabel(diffMs / (1000 * 60 * 60));
  };
  const insets = useSafeAreaInsets();
  const {
    screenMode,
    bottomSheetRef,
    snapPoints,
    totalJobsCount,
    weekShifts,
    userType,
    userId,
    user,
    notificationJob,
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
    handleAcceptSheetSubmit,
    handleAcceptSheetDecline,
    contractorStaffList,
    loadingContractorStaff,
    assignTargetShift,
    showAssignStaffModal,
    assigningStaff,
    handleAssignStaffToShift,
    closeAssignStaffModal,
    showCelebration,
    setShowCelebration,
    renderNewTab,
    renderAcceptedTab,
    capitalizeWords,
    jobData,
    notifHasWorkingWithChildren,
    notifHasWhiteCard,
    notifHideAssignForContractor,
    acceptDescription,
    acceptRequiredDocuments,
    acceptHideAssignForContractor,
    isRefreshing,
    onRefresh,
  } = useStaffShiftsController(navigation, route, "accepted");
  const isStaffooStaffMember = userId === 1 || user?.user_id === 1;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.fixedHeader}>
        <LinearGradient
          colors={[COLORS.heroBg1, COLORS.heroBg2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Soft radial accent glow — a single deliberate highlight rather
              than a flat gradient wash across the whole hero. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -60,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: COLORS.primaryGlow,
              opacity: 0.35,
            }}
          />

          <View style={styles.heroInner}>
            {/* Back + User Info in One Row */}
            <View style={styles.userHeaderRow}>
              <TouchableOpacity
                style={styles.heroBackBtn}
                onPress={() => navigation.navigate("Profile")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.8}
              >
                <ChevronLeft size={20} color="#fff" />
              </TouchableOpacity>

              <View style={styles.userInfo}>
                <Text style={styles.heroTitle}>
                  {capitalizeName(user?.name || "User Name")}
                </Text>

                <Text style={styles.heroSubtitle}>Welcome to Staffoo</Text>
              </View>

              {/* <StatusPill label="Accepted" tone="success" /> */}
            </View>

            {isStaffooStaffMember && (
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <View style={styles.statLabelRow}>
                    <CalendarDays size={12} color="rgba(255,255,255,0.55)" />
                    <Text style={styles.statLabel}>AVAILABLE JOBS</Text>
                  </View>

                  <Text style={styles.statValue}>{totalJobsCount}</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <View style={styles.statLabelRow}>
                    <Layers size={12} color="rgba(255,255,255,0.55)" />
                    <Text style={styles.statLabel}>ACCEPTED SHIFTS</Text>
                  </View>

                  <Text style={styles.statValue}>
                    {weekShifts?.length ?? 0}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
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
        {screenMode === "accepted" ? renderAcceptedTab() : renderNewTab()}
        {!notificationJob && <View style={styles.placeholder} />}
      </ScrollView>

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
        showStaffSection={
          userType === "contractor" && !acceptHideAssignForContractor
        }
        staffSelectionRequired={false}
        description={acceptDescription}
        requiredDocuments={acceptRequiredDocuments}
      />

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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <IconBadge size={40} tone="primary">
              <Text style={{ fontSize: 16 }}>🔔</Text>
            </IconBadge>
            <View>
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: "700",
                  color: COLORS.primary,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Incoming
              </Text>
              <Text style={styles.newRequest}>New job request</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <IconBadge size={32} tone="primary">
              <Calendar size={15} color={COLORS.primary} />
            </IconBadge>

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Date</Text>
              <Text style={styles.infoText}>{formatDate(jobData.start)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <IconBadge size={32} tone="info">
              <Clock size={14} color={COLORS.info} />
            </IconBadge>

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Time</Text>
              <Text style={styles.infoText}>
                {formatTime(jobData.start)} – {formatTime(jobData.end)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <IconBadge size={32} tone="danger">
              <MapPin size={14} color={COLORS.danger} />
            </IconBadge>

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
            <IconBadge size={32} tone="neutral">
              <FileText size={14} color={COLORS.textSecondary} />
            </IconBadge>

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
            <IconBadge size={32} tone="primary">
              <Clock size={14} color={COLORS.primary} />
            </IconBadge>
            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Total Hours</Text>
              <Text style={styles.infoText}>{getJobHoursLabel(jobData)}</Text>
            </View>
          </View>

          {/* ── Required Documents ── */}
          {(notifHasWorkingWithChildren || notifHasWhiteCard) && (
            <View style={styles.documentsSection}>
              <Text style={styles.documentsSectionTitle}>
                Required documents
              </Text>

              {notifHasWorkingWithChildren && (
                <View style={styles.documentRow}>
                  <Text style={styles.documentLabel}>
                    Working with Children Check Required
                  </Text>
                  <StatusPill label="Required" tone="warning" />
                </View>
              )}

              {notifHasWhiteCard && (
                <View style={[styles.documentRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.documentLabel}>White Card Required</Text>
                  <StatusPill label="Required" tone="warning" />
                </View>
              )}
            </View>
          )}

          {userType === "contractor" && !notifHideAssignForContractor && (
            <View style={{ marginVertical: 4 }}>
              <Text style={styles.assignLabel}>
                Assign to staff member (optional)
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

          <View
            style={[styles.buttonContainer, { paddingBottom: insets.bottom }]}
          >
            <GradientButton
              variant="success"
              flex={1}
              disabled={acceptingNotification}
              loading={acceptingNotification}
              onPress={handleAcceptNotification}
              label="Accept"
              icon={<CheckCircle size={16} color="#fff" />}
            />
            <GradientButton
              variant="danger"
              flex={1}
              disabled={acceptingNotification}
              onPress={handleDeclineNotification}
              label="Decline"
              icon={<XCircle size={16} color="#fff" />}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

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

      <JobAcceptedCelebration
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
      />
    </SafeAreaView>
  );
}