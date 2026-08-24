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
} from "./shifts/StaffShiftsShared";
import { useStaffShiftsController } from "./shifts/useStaffShiftsController";

type Props = { navigation: any; route: any };

export default function AvailableJobsScreen({ navigation, route }: Props) {
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
        <View style={styles.availableRow}>
          <View style={styles.availableDot} />
          <Text style={styles.availableLabel}>AVAILABLE JOBS</Text>
        </View>

        {/* {!loadingAvailable && (
          <Text style={styles.coverJobsSubtitle}>
            {totalJobsCount === 0
              ? "No open shifts right now"
              : `${totalJobsCount} open shift${
                  totalJobsCount === 1 ? "" : "s"
                } waiting for you`}
          </Text>
        )} */}
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

      {/* <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={["transparent"]}
            progressBackgroundColor="transparent"
          />
        }
      >
        {screenMode === "accepted" ? renderAcceptedTab() : renderNewTab()}
        {!notificationJob && <View style={styles.placeholder} />}
      </ScrollView> */}

   
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

   
          {userType === "contractor" && !notifHideAssignForContractor && (
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

          <View
            style={[styles.buttonContainer, { paddingBottom: insets.bottom }]}
          >
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

      {/* Transient success modal for contractor accepts with contractor_invoice === 0 */}
      <Modal visible={showAcceptSuccessModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 320,
              backgroundColor: "#fff",
              borderRadius: 16,
              overflow: "hidden",
              alignItems: "center",
            }}
          >
            <View
              style={{ height: 80, backgroundColor: "#0fa786", width: "100%" }}
            />
            <View style={{ marginTop: -40, alignItems: "center" }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#fff",
                  justifyContent: "center",
                  alignItems: "center",
                  elevation: 4,
                }}
              >
                <CheckCircle size={36} color="#0fa786" />
              </View>
            </View>
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text
                style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}
              >
                Success!
              </Text>
              <Text
                style={{ textAlign: "center", color: "#666", marginBottom: 16 }}
              >
                Please wait for the client to give further confirmation. We will
                notify you shortly and the shift will appear on your Accepted
                Jobs page.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#0b856f",
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 30,
                }}
                onPress={hideAcceptSuccessModal}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Awesome, Thanks!
                </Text>
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* <BottomTab navigation={navigation} activeTab="StaffShifts" /> */}
    </SafeAreaView>
  );
}
