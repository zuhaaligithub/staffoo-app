// ─────────────────────────────────────────────────────────────────────────────
// A minimal pub/sub so App.tsx can directly wake up whichever screen(s) are
// currently mounted (Available Jobs / Accepted Jobs) and tell them "go check
// AsyncStorage for a pending ASAP notification right now".
//
// Why this exists: navigating to an already-focused tab
// (navigationRef.navigate("MainTabs", { screen: "StaffShifts" })) does NOT
// fire a new focus event when that tab is already the active one — so the
// screen's useFocusEffect-driven checkPendingNotification never re-runs, and
// a notification tapped while already sitting on that tab silently does
// nothing. This bus is the direct line that doesn't depend on focus changing
// at all.
//
// Both AvailableJobsScreen and AcceptedJobsScreen subscribe on mount (via
// useStaffShiftsController). Their own globalIsCheckingPending lock (in
// useStaffShiftsController.tsx) still ensures only one of them actually
// consumes a given pending payload if more than one happens to be mounted.
// ─────────────────────────────────────────────────────────────────────────────
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToPendingNotifications(
  listener: Listener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyPendingNotificationAvailable(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("[notificationBus] listener error:", e);
    }
  });
}
