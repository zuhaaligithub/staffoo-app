

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
  getInitials,
  formatDate,
  formatTime,
  StaffAssignSheet,
  styles,
  cardStyles,
  assignStyles,
  IconBadge,
  StatusPill,
  GradientButton,
} from "./shifts/StaffShiftsShared";
import { useStaffShiftsController } from "./shifts/useStaffShiftsController";

type Props = { navigation: any; route: any };

export default function AvailableJobsScreen({ navigation, route }: Props) {
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
  } = useStaffShiftsController(navigation, route, "available");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Cover Jobs Banner */}
      <View style={styles.coverJobsBanner}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={styles.availableRow}>
            <View style={styles.availableDot} />
            <Text style={styles.availableLabel}>Available jobs</Text>
          </View>
          {typeof totalJobsCount === "number" && (
            <StatusPill
              label={`${totalJobsCount} open`}
              tone={totalJobsCount > 0 ? "primary" : "neutral"}
            />
          )}
        </View>

        {/* {!loadingAvailable && ( */}
        <Text style={styles.coverJobsSubtitle}>
          {loadingAvailable
            ? "Loading available shifts…"
            : totalJobsCount === 0
            ? "No open shifts right now — pull to refresh"
            : typeof totalJobsCount === "number"
            ? `${totalJobsCount} open shift${
                totalJobsCount === 1 ? "" : "s"
              } waiting for you`
            : "—"}
        </Text>
        {/* )} */}
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
              marginBottom: 10,
            }}
          >
            <IconBadge size={40} tone="primary">
              <Text style={{ fontSize: 14 }}>🔔</Text>
            </IconBadge>
            <View>
              <Text
                style={{
                  fontSize: 9.5,
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
            <IconBadge size={28} tone="primary">
              <Calendar size={14} color={COLORS.primary} />
            </IconBadge>

            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Date</Text>
              <Text style={styles.infoText}>{formatDate(jobData.start)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <IconBadge size={28} tone="info">
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
            <IconBadge size={28} tone="danger">
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
            <IconBadge size={28} tone="neutral">
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
            <IconBadge size={28} tone="primary">
              <Clock size={14} color={COLORS.primary} />
            </IconBadge>
            <View style={{ flex: 1 }}>
              <Text style={assignStyles.infoLabel}>Total Hours</Text>
              <Text style={styles.infoText}>{getJobHoursLabel(jobData)}</Text>
            </View>
          </View>

          {/* ── Required Documents ── */}
          {notifRequiredDocuments.length > 0 && (
            <View style={styles.documentsSection}>
              <Text style={styles.documentsSectionTitle}>
                Required documents
              </Text>

              {notifRequiredDocuments.map((doc, index) => {
                const labelMap: Record<string, string> = {
                  working_with_children: "Working With Children Check Required",
                  white_card: "White Card Required",
                  security_license: "Security Licence Required",
                  first_aid: "First Aid Certificate Required",
                  first_aid_certificate: "First Aid Certificate Required",
                  rsa_certificate: "RSA Certificate Required",
                  ras_certificate: "RAS Certificate Required",
                  control_room_certificate: "Control Room Certificate Required",
                  msic_card: "MSIC Card Required",
                  police_check: "Police Check Required",
                  cpr: "CPR Certificate Required",
                  cpr_certificate: "CPR Certificate Required",
                  vaccination: "Vaccination Certificate Required",
                  vaccination_certificate: "Vaccination Certificate Required",
                };

                const label =
                  labelMap[doc] ||
                  doc
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase()) + " Required";

                return (
                  <View
                    key={doc}
                    style={[
                      styles.documentRow,
                      index === notifRequiredDocuments.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <Text style={styles.documentLabel}>{label}</Text>
                    <StatusPill label="YES" />
                  </View>
                );
              })}
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
                      <UserCheck size={16} color={COLORS.primary} />
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

      {/* Transient success modal for contractor accepts with contractor_invoice === 0 */}
      <Modal visible={showAcceptSuccessModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(4,6,9,0.78)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 340,
              backgroundColor: COLORS.surfaceRaised,
              borderRadius: 26,
              overflow: "hidden",
              alignItems: "center",
              borderWidth: 1,
              borderColor: COLORS.cardBorder,
            }}
          >
            <LinearGradient
              colors={[COLORS.success, "#1F7A57"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 88, width: "100%" }}
            />
            <View style={{ marginTop: -36, alignItems: "center" }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: COLORS.surfaceRaised,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 3,
                  borderColor: COLORS.surfaceRaised,
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: COLORS.successSoft,
                    borderWidth: 1,
                    borderColor: COLORS.successBorder,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CheckCircle size={32} color={COLORS.success} />
                </View>
              </View>
            </View>
            <View style={{ padding: 22, alignItems: "center", width: "100%" }}>
              <Text
                style={{
                  fontSize: 19,
                  fontWeight: "800",
                  color: COLORS.text,
                  marginBottom: 10,
                }}
              >
                Request sent!
              </Text>
              <Text
                style={{
                  textAlign: "center",
                  color: COLORS.textSecondary,
                  marginBottom: 18,
                  fontSize: 13.5,
                  lineHeight: 20,
                }}
              >
                Please wait for the client to give further confirmation. We will
                notify you shortly and the shift will appear on your Accepted
                Jobs page.
              </Text>
              <GradientButton
                variant="primary"
                onPress={hideAcceptSuccessModal}
                label="Awesome, thanks!"
                icon={<CheckCircle size={16} color={COLORS.textOnPrimary} />}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* <BottomTab navigation={navigation} activeTab="StaffShifts" /> */}
    </SafeAreaView>
  );
}
