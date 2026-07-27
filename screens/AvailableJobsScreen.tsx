// ─────────────────────────────────────────────────────────────────────────────
// Available Jobs screen (route name "StaffShifts" in the tab navigator).
// All state/logic lives in useStaffShiftsController (screens/shifts) — this
// file is just the screen's JSX, split out of the old combined StaffShifts.tsx
// so "Available Jobs" and "Accepted Jobs" are separate pages/components.
// ─────────────────────────────────────────────────────────────────────────────
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
  tabStyles,
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
    contractorAvailableSubTab,
    setContractorAvailableSubTab,
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
    renderAvailableCard,
    renderShiftCard,
    renderJobsListFooter,
    renderNewTab,
    renderAcceptedTab,
    renderPendingAssigningTab,
    pendingAssigningCount,
    capitalizeWords,
    jobData,
    notifRequiredDocuments,
    notifHasWorkingWithChildren,
    notifHasWhiteCard,
    notifDescription,
    acceptRawJob,
    acceptDescription,
    acceptRequiredDocuments,
    showingAvailableList,
    isRefreshing,
    onRefresh,
  } = useStaffShiftsController(navigation, route, "available");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

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
          <View>
          
                     <Text
              style={styles.greeting}
              numberOfLines={2}
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
                    {tab === "Pending Assigning" &&
                      pendingAssigningCount > 0 && (
                        <View style={tabStyles.badge}>
                          <Text style={tabStyles.badgeText}>
                            {pendingAssigningCount}
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

      {/* <BottomTab navigation={navigation} activeTab="StaffShifts" /> */}
    </SafeAreaView>
  );
}
