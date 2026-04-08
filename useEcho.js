


import { useEffect, useRef } from "react";
import { getEchoInstance, destroyEchoInstance } from "./echo";
import { setCallState } from "./useCallManagerRN";
import { toast } from "react-toastify";
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundPlayer from 'react-native-sound-player';

// Helper function to play sound in React Native
const playAlertSound = (type) => {
  try {
    const soundAsset = type === "chat" 
      ? require("./assets/tune/alert.wav") 
      : require("./assets/call.mp3");
    
    console.log(`[Echo] 🔊 Playing ${type} sound asset`);
    SoundPlayer.playAsset(soundAsset);
  } catch (e) {
    console.warn("[Echo] ❌ Sound playback failed:", e);
  }
};

export const useEcho = () => {
  // 🔥 Keep track of recently ended calls so we don't ghost ring
  const deadCallsRef = useRef(new Set());

  useEffect(() => {
    const setup = async () => {
      const userId = await AsyncStorage.getItem('@user_id');
      const token = await AsyncStorage.getItem('@auth_token');

      if (!token || !userId) return;

      const echo = getEchoInstance(token);
      const pusherConn = echo.connector.pusher.connection;

      const onConnected = () =>
        console.log("%c✅ Pusher connected", "color:#22C55E;font-weight:bold");
      const onFailed = () => console.error("[Echo] ❌ Connection FAILED");
      const onError = (err) =>
        console.error("[Echo] ❌ Connection error:", err?.error?.message ?? err);

      if (pusherConn.state === "connected") {
        onConnected();
      } else {
        pusherConn.bind("connected", onConnected);
      }
      pusherConn.bind("failed", onFailed);
      pusherConn.bind("error", onError);

      const channelName = `notifications.${userId}`;
      const eventName = ".push.notification";

      echo
        .private(channelName)
        .listen(eventName, (data) => {
          console.log("🔔 Echo event received:", data);

          const callStatus = data.call?.status || data.status;
          const incomingCallId = data.call_id || data.call?.id;

          // ── 1. DEFENSIVE SHIELD: INTERCEPT HANGUPS FIRST ────────────────
          if (
            data.type === "rejected" ||
            data.type === "ended" ||
            data.type === "end_call" ||
            data.type === "call_ended" ||
            data.type === "call_rejected" ||
            callStatus === "ended" ||
            callStatus === "rejected" ||
            callStatus === "missed"
          ) {
            console.log("[Echo] Call ended/rejected. Clearing session.");

            if (incomingCallId) {
              deadCallsRef.current.add(String(incomingCallId));
            }

            setCallState({ incoming: null, outgoing: null, inCall: false });
            return;
          }

          // ── 2. INCOMING CALL HANDLING ───────────────────────────────────
          if (
            data.type === "start_call" &&
            (data.roomName || data.channel_name)
          ) {
            if (
              incomingCallId &&
              deadCallsRef.current.has(String(incomingCallId))
            ) {
              console.warn(
                "[Echo] Blocked ghost ring for a call that already ended.",
              );
              return;
            }

            const callerId =
              data.caller_id ?? data.call?.caller_id ?? data.callerId;
            const receiverId =
              data.receiver_id ?? data.call?.receiver_id ?? data.receiverId;

            if (callerId && String(callerId) === String(userId)) return;
            if (receiverId && String(receiverId) !== String(userId)) return;

            setCallState({
              incoming: {
                roomName: data.roomName || data.channel_name,
                staffName:
                  data.staffName ||
                  data.callerName ||
                  data.caller?.name ||
                  "Incoming Call",
                caller_id: callerId,
                receiver_id: receiverId,
                call_id: incomingCallId,
                agoraConfig: {
                  appId: '4c98656fc9a34bdb8ad5e34c1b356ef2',
                  channel: data.roomName || data.channel_name,
                  token: data.token || '',
                  uid: data.uid || 0,
                },
                ...data,
              },
            });
          }

          // ── 3. CHAT MESSAGE HANDLING ────────────────────────────────────
          else if (data.message_id && data.message) {
            playAlertSound("chat");
            const senderName = data.sender_name || data.user?.name || "Someone";
            toast.info(`New message from ${senderName}`, { icon: "💬" });
          }

          // ── 4. GENERAL NOTIFICATION ─────────────────────────────────────
          else {
            playAlertSound("notification");
            toast.success(
              data.title || data.message || "You have a new notification!",
              { icon: "🔔" },
            );
          }
        })
        .error((error) => {
          console.error("[Echo] Channel subscription error:", error);
        });

      // Also listen to specific endpoints just in case
      echo
        .private(`user.${userId}`)
        .listen(".call.ended", () => {
          setCallState({ incoming: null, outgoing: null, inCall: false });
        })
        .listen(".call.rejected", () => {
          setCallState({ incoming: null, outgoing: null, inCall: false });
        });

      return () => {
        pusherConn.unbind("connected", onConnected);
        pusherConn.unbind("failed", onFailed);
        pusherConn.unbind("error", onError);
        echo.private(channelName).stopListening(eventName);
        echo.private(`user.${userId}`).stopListening(".call.ended");
        echo.private(`user.${userId}`).stopListening(".call.rejected");
      };
    };

    setup();
  }, []);

  return null;
};
