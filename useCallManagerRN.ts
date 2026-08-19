// useCallManagerRN.ts
import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import Toast from "react-native-toast-message";
import {
  getEchoInstance,
  destroyEchoInstance,
  waitForConnection,
} from "./echo";
import SoundPlayer from "react-native-sound-player";
import { navigationRef } from "./App";
import { getAuthToken } from "./services/authApi";

// ---------------------------------------------------------------------------
// Sound helper
// ---------------------------------------------------------------------------
const playAlertSound = (type: "chat" | "call") => {
  try {
    const soundAsset =
      type === "chat"
        ? require("./assets/tune/alert.wav")
        : require("./assets/call.mp3");
    console.log(`[EchoRN] 🔊 Playing ${type} sound`);
    SoundPlayer.playAsset(soundAsset);
  } catch (e) {
    console.warn("[EchoRN] ❌ Sound playback failed:", e);
  }
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AgoraConfig {
  appId: string;
  channel: string;
  token: string;
  uid: number;
}

export interface CallSession {
  callId?: string | number;
  receiverName?: string;
  callerName?: string;
  roomName: string;
  uid?: number;
  agoraConfig: AgoraConfig;
  caller_id?: string | number;
  receiver_id?: string | number;
  call_id?: string | number;
  channel_name?: string;
  staffName?: string;
  caller?: any;
}

// ---------------------------------------------------------------------------
// Global call state (no Redux)
// ---------------------------------------------------------------------------
let _state: {
  incoming: CallSession | null;
  outgoing: CallSession | null;
  inCall: boolean;
} = { incoming: null, outgoing: null, inCall: false };

let _listeners: Array<() => void> = [];

export const setCallState = (patch: Partial<typeof _state>) => {
  _state = { ..._state, ...patch };
  _listeners.forEach((fn) => fn());
};

export function useCallSession() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    _listeners.push(rerender);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== rerender);
    };
  }, [rerender]);

  return {
    incomingCall: _state.incoming,
    outgoingCall: _state.outgoing,
    inCall: _state.inCall,
    setIncomingCall: (v: CallSession | null) => setCallState({ incoming: v }),
    setOutgoingCall: (v: CallSession | null) => setCallState({ outgoing: v }),
    setInCall: (v: boolean) => setCallState({ inCall: v }),
    clearSession: () =>
      setCallState({ incoming: null, outgoing: null, inCall: false }),
  };
}

// ---------------------------------------------------------------------------
// Echo / subscription state
// ---------------------------------------------------------------------------
let _echo: any = null;
let _subscribedUserId: string | null = null;
let _deadCalls = new Set<string>();
let _lastSoundTimes = new Map<string, number>();

const EVENT = ".push.notification";
const AGORA_APP_ID = "4c98656fc9a34bdb8ad5e34c1b356ef2";

// ---------------------------------------------------------------------------
// Event handler
// ---------------------------------------------------------------------------
function handleEchoEvent(data: any, userId: string) {
  console.log("[EchoRN] 🔔 Event:", JSON.stringify(data, null, 2));

  const callStatus = data.call?.status || data.status;
  const incomingCallId = String(data.call_id || data.call?.id || "");

  // --- Call end / reject ---
  const isEndEvent =
    data.type === "rejected" ||
    data.type === "ended" ||
    data.type === "end_call" ||
    data.type === "call_ended" ||
    data.type === "call_rejected" ||
    callStatus === "ended" ||
    callStatus === "rejected" ||
    callStatus === "missed";

  if (isEndEvent) {
    console.log("[EchoRN] 📴 Call ended/rejected");
    if (incomingCallId) _deadCalls.add(incomingCallId);
    setCallState({ incoming: null, outgoing: null, inCall: false });
    return;
  }

  // --- Incoming call ---
  const isStartCall =
    data.type === "start_call" ||
    data.type === "incoming_call" ||
    data.type === "call_incoming" ||
    data.type === "incoming";

  if (isStartCall && (data.roomName || data.channel_name)) {
    if (incomingCallId && _deadCalls.has(incomingCallId)) {
      console.warn("[EchoRN] Blocked ghost ring");
      return;
    }

    const callerId = data.caller_id ?? data.call?.caller_id ?? data.callerId;
    const receiverId =
      data.receiver_id ?? data.call?.receiver_id ?? data.receiverId;

    if (callerId && String(callerId) === String(userId)) {
      console.log("[EchoRN] Dropping — I am the caller");
      return;
    }
    if (receiverId && String(receiverId) !== String(userId)) {
      console.log(
        `[EchoRN] Dropping — not for me (intended: ${receiverId}, me: ${userId})`,
      );
      return;
    }

    console.log("[EchoRN] 📲 INCOMING CALL — updating state");
    playAlertSound("call");
    setCallState({
      incoming: {
        callId: incomingCallId || undefined,
        call_id: incomingCallId || undefined,
        callerName:
          data.caller_name ||
          data.staffName ||
          data.callerName ||
          data.caller?.name ||
          "Someone",
        roomName: data.channel_name || data.roomName,
        channel_name: data.channel_name || data.roomName,
        caller_id: callerId,
        receiver_id: receiverId,
        agoraConfig: {
          appId: AGORA_APP_ID,
          channel: data.channel_name || data.roomName,
          token: "",
          uid: 0,
        },
        ...data,
      },
    });
    return;
  }

  // --- Chat message ---
  if (data.message_id && data.message) {
    const currentRoute = navigationRef?.isReady()
      ? navigationRef.getCurrentRoute()?.name
      : null;

    if (currentRoute === "Messages") {
      console.log("[EchoRN] 💬 In chat screen — skipping toast");
      return;
    }

    const now = Date.now();
    const senderId = String(data.sender_id || data.user?.id || "unknown");
    const lastSound = _lastSoundTimes.get(senderId) || 0;

    if (now - lastSound > 10000) {
      playAlertSound("chat");
      _lastSoundTimes.set(senderId, now);
    }

    const senderName = data.sender_name || data.user?.name || "Someone";
    Toast.show({
      type: "info",
      text1: `New Message from ${senderName}`,
      text2: data.message,
      onPress: () => {
        if (navigationRef?.isReady()) {
          navigationRef.navigate("Messages");
        }
      },
    });
    return;
  }

  // --- General push notification ---
  if (data.title || data.message) {
    console.log("[EchoRN] 🔔 General notification");
    playAlertSound("chat");
    Toast.show({
      type: "info",
      text1: data.title || "Notification",
      text2: data.message,
    });
  }
}

// ---------------------------------------------------------------------------
// echoUnsubscribe
// ---------------------------------------------------------------------------
function echoUnsubscribe() {
  try {
    if (_echo && _subscribedUserId) {
      _echo.private(`notifications.${_subscribedUserId}`).stopListening(EVENT);
      _echo.private(`user.${_subscribedUserId}`).stopListening(".call.ended");
      _echo
        .private(`user.${_subscribedUserId}`)
        .stopListening(".call.rejected");
      _echo.disconnect();
    }
  } catch (_) {
    // Silent — cleanup must never crash the app
  } finally {
    _echo = null;
    _subscribedUserId = null;
  }
}

// ---------------------------------------------------------------------------
// echoSubscribe
// After getEchoInstance() succeeds, we wait for the Pusher WebSocket to reach
// 'connected' before calling .private() — which internally calls
// pusher.subscribe() and needs a live socket ID.
// ---------------------------------------------------------------------------
async function echoSubscribe(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    const userRaw =
      (await AsyncStorage.getItem("@user")) ||
      (await AsyncStorage.getItem("user"));

    let userId: string | null = null;
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw);
        userId = String(
          parsed?.id ?? parsed?.data?.id ?? parsed?.user?.id ?? "",
        );
      } catch (_) {}
    }
    if (!userId) userId = await AsyncStorage.getItem("@user_id");

    if (!token || !userId) {
      console.warn("[EchoRN] ❌ Missing token or userId", {
        hasToken: Boolean(token),
        userId,
      });
      return false;
    }

    // Reuse an already-connected subscription
    if (_subscribedUserId === userId && _echo) {
      const state = _echo.connector?.pusher?.connection?.state;
      console.log("[EchoRN] ℹ️ Existing subscription (state:", state, ")");
      if (state === "connected" || state === "connecting") return true;
    }

    echoUnsubscribe();

    // Build a fresh Echo instance (with global.Pusher injected inside)
    _echo = await getEchoInstance();

    const connection = _echo?.connector?.pusher?.connection;
    if (!connection) {
      console.warn("[EchoRN] ❌ No connection object after getEchoInstance");
      return false;
    }

    console.log(
      "[EchoRN] ⏳ Waiting for Pusher to connect (state:",
      connection.state,
      ")",
    );

    // Block until WebSocket handshake completes — required before subscribe()
    await waitForConnection(connection, 25000);

    console.log("[EchoRN] ✅ Connected — subscribing to channels");
    _subscribedUserId = userId;

    _echo
      .private(`notifications.${userId}`)
      .listen(EVENT, (data: any) => handleEchoEvent(data, userId!))
      .error((err: any) => {
        console.error("[EchoRN] ❌ Notification channel error:", err);
        if (err?.status === 401 || String(err?.error || "").includes("401")) {
          _subscribedUserId = null;
        }
      });

    _echo
      .private(`user.${userId}`)
      .listen(".call.ended", () =>
        setCallState({ incoming: null, outgoing: null, inCall: false }),
      )
      .listen(".call.rejected", () =>
        setCallState({ incoming: null, outgoing: null, inCall: false }),
      )
      .error((err: any) => {
        console.error("[EchoRN] ❌ Call channel error:", err);
        if (err?.status === 401 || String(err?.error || "").includes("401")) {
          _subscribedUserId = null;
        }
      });

    console.log(`[EchoRN] ✅ Subscribed — userId: ${userId}`);
    return true;
  } catch (err: any) {
    console.error("[EchoRN] ❌ Subscribe failed:", err);
    echoUnsubscribe();
    return false;
  }
}

// ---------------------------------------------------------------------------
// useEchoCallListener hook
// ---------------------------------------------------------------------------
export function useEchoCallListener() {
  const retryRef = useRef<NodeJS.Timeout | null>(null);

  const trySubscribe = useCallback(async () => {
    const success = await echoSubscribe();
    if (success && retryRef.current) {
      clearInterval(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  useEffect(() => {
    trySubscribe();

    retryRef.current = setInterval(() => {
      if (!_subscribedUserId) {
        trySubscribe();
      } else if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    }, 7000);

    const appStateSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          console.log("[EchoRN] App foregrounded — retrying subscription");
          trySubscribe();
        }
      },
    );

    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      appStateSub.remove();
      echoUnsubscribe();
      destroyEchoInstance();
    };
  }, [trySubscribe]);
}

// ---------------------------------------------------------------------------
// Call Manager
// ---------------------------------------------------------------------------
// const BASE_URL = 'https://apis.staffoo.com.au';
const BASE_URL = "https://apis-staging.staffoo.com.au";

async function apiPost(endpoint: string, body: object = {}) {
  let token = await AsyncStorage.getItem("@auth_token");
  if (!token) token = await AsyncStorage.getItem("auth_token");
  if (!token) token = await AsyncStorage.getItem("@token");

  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API failed: ${res.status} - ${text}`);
  }
  return res.json();
}

export function useCallManagerRN() {
  const [isCalling, setIsCalling] = useState(false);
  const session = useCallSession();

  const isCurrentlyInCall =
    _state.inCall || !!_state.incoming || !!_state.outgoing;

  const initiateCall = async (user: { id: string | number; name: string }) => {
    if (!user?.id) {
      Toast.show({ type: "error", text1: "Invalid user" });
      return;
    }
    if (isCurrentlyInCall) {
      Toast.show({ type: "error", text1: "Already in a call" });
      return;
    }

    try {
      setIsCalling(true);

      const initRes = await apiPost("api/calls/initiate", {
        receiver_id: user.id,
      });

      if (!initRes?.success || !initRes?.call) {
        Toast.show({
          type: "error",
          text1: initRes?.error || "Failed to initiate call",
        });
        return;
      }

      const channelName =
        initRes.call.channel_name ?? initRes.agora_config?.channel_name;
      const uid =
        initRes.agora_config?.uid ?? Math.floor(Math.random() * 100000);

      const tokenRes = await apiPost("api/agora/token", {
        channel_name: channelName,
        uid,
      });

      if (!tokenRes?.token) {
        Toast.show({ type: "error", text1: "Failed to get Agora token" });
        return;
      }

      session.setOutgoingCall({
        callId: initRes.call.id,
        receiverName: user.name,
        roomName: channelName,
        uid,
        agoraConfig: {
          appId: AGORA_APP_ID,
          channel: channelName,
          token: tokenRes.token,
          uid: tokenRes.uid ?? uid,
        },
      });
    } catch (err: any) {
      console.error("[CallManager] initiateCall error:", err);
      Toast.show({
        type: "error",
        text1: err.message || "Call initiation failed",
      });
    } finally {
      setIsCalling(false);
    }
  };

  const acceptIncomingCall = async (
    currentUserId?: string | number,
  ): Promise<AgoraConfig | null> => {
    const incoming = _state.incoming;
    if (!incoming) return null;

    try {
      const callId = incoming.call_id ?? incoming.callId;
      const acceptRes = await apiPost(`api/calls/accept/${callId}`, {
        call_id: callId,
        callId,
      });

      if (!acceptRes?.success) {
        Toast.show({
          type: "error",
          text1: acceptRes?.error || "Failed to accept call",
        });
        return null;
      }

      const channelName =
        acceptRes?.call?.channel_name ||
        acceptRes?.call?.channelName ||
        incoming.channel_name ||
        incoming.roomName;

      let uid = Number(currentUserId);
      if (isNaN(uid) || uid <= 0) {
        uid = Math.floor(Math.random() * 100000) + 1000;
      }

      const tokenRes = await apiPost("api/agora/token", {
        channel_name: channelName,
        uid,
      });

      if (!tokenRes?.token) return null;

      return {
        appId: tokenRes.app_id ?? AGORA_APP_ID,
        channel: channelName,
        token: tokenRes.token,
        uid: tokenRes.uid ?? uid,
      };
    } catch (err: any) {
      console.error("[CallManager] acceptIncomingCall error:", err);
      Toast.show({ type: "error", text1: "Accept call failed" });
      return null;
    }
  };

  const endCall = useCallback(
    async (isReject = false, manualCallId?: string | number) => {
      const activeCallId =
        manualCallId ?? _state.incoming?.call_id ?? _state.outgoing?.callId;

      console.log(
        `[CallManager] endCall (reject: ${isReject}, id: ${activeCallId})`,
      );

      setCallState({ incoming: null, outgoing: null, inCall: false });

      if (activeCallId) {
        const endpoint = isReject
          ? `api/calls/reject/${activeCallId}`
          : `api/calls/end/${activeCallId}`;
        apiPost(endpoint).catch((e) =>
          console.error("[CallManager] ❌ End call API error:", e),
        );
      } else {
        console.warn("[CallManager] ⚠️ No activeCallId to send to server");
      }
    },
    [],
  );

  return {
    initiateCall,
    acceptIncomingCall,
    endCall,
    isCalling,
    isCurrentlyInCall,
  };
}
