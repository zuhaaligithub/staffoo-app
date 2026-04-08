
import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import { getEchoInstance, destroyEchoInstance } from './echo';
import SoundPlayer from 'react-native-sound-player';
import { navigationRef } from './App';

// Helper function to play sound in React Native
const playAlertSound = (type: 'chat' | 'call') => {
  try {
    const soundAsset = type === 'chat' 
      ? require('./assets/tune/alert.wav') 
      : require('./assets/call.mp3');
    
    console.log(`[EchoRN] 🔊 Playing ${type} sound asset`);
    SoundPlayer.playAsset(soundAsset);
  } catch (e) {
    console.warn('[EchoRN] ❌ Sound playback failed:', e);
  }
};

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

// Global state (no Redux)
let _state: { incoming: CallSession | null; outgoing: CallSession | null; inCall: boolean } = {
  incoming: null,
  outgoing: null,
  inCall: false,
};

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
    clearSession: () => setCallState({ incoming: null, outgoing: null, inCall: false }),
  };
}

// Echo variables
let _echo: any = null;
let _subscribedUserId: string | null = null;
let _deadCalls = new Set<string>();
let _notifiedSenders = new Set<string>();
let _lastSoundTimes = new Map<string, number>();
const EVENT = '.push.notification';
const AGORA_APP_ID = '4c98656fc9a34bdb8ad5e34c1b356ef2';

function handleEchoEvent(data: any, userId: string) {
  console.log('[EchoRN] 🔔 Event:', JSON.stringify(data, null, 2));

  const callStatus = data.call?.status || data.status;
  const incomingCallId = String(data.call_id || data.call?.id || '');

  // Handle call end/reject first
  const isEndEvent =
    data.type === 'rejected' ||
    data.type === 'ended' ||
    data.type === 'end_call' ||
    data.type === 'call_ended' ||
    data.type === 'call_rejected' ||
    callStatus === 'ended' ||
    callStatus === 'rejected' ||
    callStatus === 'missed';

  if (isEndEvent) {
    console.log('[EchoRN] 📴 Call ended/rejected');
    if (incomingCallId) _deadCalls.add(incomingCallId);
    setCallState({ incoming: null, outgoing: null, inCall: false });
    return;
  }

  // Handle incoming call
  if (data.type === 'start_call' && (data.roomName || data.channel_name)) {
    if (incomingCallId && _deadCalls.has(incomingCallId)) {
      console.warn('[EchoRN] Blocked ghost ring');
      return;
    }

    const callerId = data.caller_id ?? data.call?.caller_id ?? data.callerId;
    const receiverId = data.receiver_id ?? data.call?.receiver_id ?? data.receiverId;

    if (callerId && String(callerId) === String(userId)) {
      console.log('[EchoRN] Dropping — I am the caller');
      return;
    }
    
    // If receiverId exists, we MUST match it. If it doesn't exist, we'll allow it (broadcast-style).
    if (receiverId && String(receiverId) !== String(userId)) {
      console.log(`[EchoRN] Dropping — not for me (intended: ${receiverId}, me: ${userId})`);
      return;
    }

    console.log('[EchoRN] 📲 INCOMING CALL DETECTED — updating state');

    setCallState({
      incoming: {
        callId: incomingCallId || undefined,
        call_id: incomingCallId || undefined,
        callerName:
          data.caller_name ||
          data.staffName ||
          data.callerName ||
          data.caller?.name ||
          'Someone',
        roomName: data.channel_name || data.roomName,
        channel_name: data.channel_name || data.roomName,
        caller_id: callerId,
        receiver_id: receiverId,
        agoraConfig: {
          appId: AGORA_APP_ID,
          channel: data.channel_name || data.roomName,
          token: '',
          uid: 0,
        },
        ...data,
      },
    });
  }

  // Handle chat message notification
  else if (data.message_id && data.message) {
    const currentRoute = navigationRef?.isReady() ? navigationRef.getCurrentRoute()?.name : null;
    
    // 1. If user is already in the chat, don't show a notification
    if (currentRoute === 'Messages') {
      console.log('[EchoRN] 💬 In chat screen — skipping toast');
      return;
    }

    const now = Date.now();
    const senderId = String(data.sender_id || data.user?.id || 'unknown');
    const lastSound = _lastSoundTimes.get(senderId) || 0;

    console.log(`[EchoRN] 💬 Chat message received from ${senderId}`);

    // 2. Only play the tune if it's been more than 10 seconds since the last one
    if (now - lastSound > 10000) {
      playAlertSound('chat');
      _lastSoundTimes.set(senderId, now);
    }

    // 3. Always show the toast so the user can read the new message
    const senderName = data.sender_name || data.user?.name || 'Someone';
    Toast.show({
      type: 'info',
      text1: `New Message from ${senderName}`,
      text2: data.message,
      onPress: () => {
        if (navigationRef?.isReady()) {
          navigationRef.navigate('Messages');
        }
      },
    });
  }

  // Handle general push notification
  else if (data.title || data.message) {
    console.log('[EchoRN] 🔔 General notification received');
    playAlertSound('chat'); // Using chat sound for general notifications too
    Toast.show({
      type: 'info',
      text1: data.title || 'Notification',
      text2: data.message,
    });
  }
}

// ==================== FIXED ECHO SUBSCRIPTION ====================

async function echoSubscribe(): Promise<boolean> {
  try {
    let token = await AsyncStorage.getItem('@auth_token');
    if (!token) token = await AsyncStorage.getItem('auth_token');
    if (!token) token = await AsyncStorage.getItem('@token');

    let userRaw = await AsyncStorage.getItem('@user');
    if (!userRaw) userRaw = await AsyncStorage.getItem('user');

    let userId: string | null = null;
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw);
        userId = String(parsed?.id ?? parsed?.data?.id ?? parsed?.user?.id ?? '');
      } catch (e) {}
    }
    if (!userId) userId = await AsyncStorage.getItem('@user_id');

    if (!token || !userId) {
      // ✅ Don't log error — this is normal before login
      console.log('[EchoRN] Not logged in yet, skipping subscription');
      return false;
    }
    if (_subscribedUserId === userId && _echo) {
      console.log('[EchoRN] Already subscribed to this user');
      return true;
    }

    echoUnsubscribe();

    console.log(`[EchoRN] Subscribing for user: ${userId}`);

    // ✅ Correct way - await the async function
    _echo = await getEchoInstance();        // ← This was the main bug
    _subscribedUserId = userId;

    if (!_echo) {
      console.error('[EchoRN] Failed to create Echo instance');
      return false;
    }

    // Optional: Log connection
    const connection = _echo.connector?.pusher?.connection;
    if (connection) {
      connection.bind('connected', () => {
        console.log('%c✅ Pusher Connected Successfully (CallManager)', 'color:#22C55E;font-weight:bold');
      });
    }

    // Subscribe to notification channel
    _echo
      .private(`notifications.${userId}`)
      .listen(EVENT, (data: any) => handleEchoEvent(data, userId!))
      .error((err: any) => console.error('[EchoRN] Notification channel error:', err));

    // Subscribe to call channels
    _echo
      .private(`user.${userId}`)
      .listen('.call.ended', () => {
        console.log('[EchoRN] call.ended received');
        setCallState({ incoming: null, outgoing: null, inCall: false });
      })
      .listen('.call.rejected', () => {
        console.log('[EchoRN] call.rejected received');
        setCallState({ incoming: null, outgoing: null, inCall: false });
      })
      .error((err: any) => console.error('[EchoRN] Call channel error:', err));

    console.log(`[EchoRN] ✅ Successfully subscribed to notifications.${userId} and user.${userId}`);
    return true;

  } catch (err: any) {
    console.error('[EchoRN] Subscribe error:', err);
    return false;
  }
}

function echoUnsubscribe() {
  try {
    if (_echo && _subscribedUserId) {
      _echo.private(`notifications.${_subscribedUserId}`).stopListening(EVENT);
      _echo.private(`user.${_subscribedUserId}`).stopListening('.call.ended');
      _echo.private(`user.${_subscribedUserId}`).stopListening('.call.rejected');
    }
  } catch (err) {
    // Silent fail on cleanup
  } finally {
    _echo = null;
    _subscribedUserId = null;
  }
}

// function echoUnsubscribe() {
//   try {
//     if (_echo && _subscribedUserId) {
//       _echo.private(`notifications.${_subscribedUserId}`).stopListening(EVENT);
//       _echo.private(`user.${_subscribedUserId}`).stopListening('.call.ended');
//       _echo.private(`user.${_subscribedUserId}`).stopListening('.call.rejected');
//     }
//     _notifiedSenders.clear(); // Reset notification tracking
//     _lastSoundTimes.clear(); // Reset sound anti-spam tracking
//   } catch (err) {
//     console.error('[EchoRN] Unsubscribe error:', err);
//   } finally {
//     _echo = null;
//     _subscribedUserId = null;
//   }
// }

// async function echoSubscribe(): Promise<boolean> {
//   try {
//     let token = await AsyncStorage.getItem('@auth_token');
//     if (!token) token = await AsyncStorage.getItem('auth_token');
//     if (!token) token = await AsyncStorage.getItem('@token');

//     let userRaw = await AsyncStorage.getItem('@user');
//     if (!userRaw) userRaw = await AsyncStorage.getItem('user');

//     let userId: string | null = null;
//     if (userRaw) {
//       try {
//         const parsed = JSON.parse(userRaw);
//         userId = String(parsed?.id ?? parsed?.data?.id ?? '');
//       } catch {}
//     }
//     if (!userId) userId = await AsyncStorage.getItem('@user_id');

//     if (!token || !userId) {
//       console.log('[EchoRN] Missing token or userId');
//       return false;
//     }

//     if (_subscribedUserId === userId && _echo) return true;

//     echoUnsubscribe();

//     _echo = getEchoInstance();
//     _subscribedUserId = userId;

//     const connection = _echo.connector.pusher.connection;
//     connection.bind('connected', () => {
//       console.log('%c✅ Pusher Connected Successfully (CallManager)', 'color:#22C55E;font-weight:bold');
//     });

//     console.log('[EchoRN] Connecting Echo for user (Private Channels):', userId);

//     _echo
//       .private(`notifications.${userId}`)
//       .listen(EVENT, (data: any) => handleEchoEvent(data, userId!))
//       .error((err: any) => {
//         console.error('[EchoRN] Channel error:', err);
//       });

//     _echo
//       .private(`user.${userId}`)
//       .listen('.call.ended', () => {
//         console.log('[EchoRN] call.ended');
//         setCallState({ incoming: null, outgoing: null, inCall: false });
//       })
//       .listen('.call.rejected', () => {
//         console.log('[EchoRN] call.rejected');
//         setCallState({ incoming: null, outgoing: null, inCall: false });
//       });

//     console.log('[EchoRN] ✅ Subscribed to private channels');

//     console.log('[EchoRN] ✅ Subscribed successfully');
//     return true;
//   } catch (err) {
//     console.error('[EchoRN] Subscribe error:', err);
//     return false;
//   }
// }

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
      if (!_subscribedUserId) trySubscribe();
      else if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    }, 7000);

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        console.log('[EchoRN] App foregrounded — retrying subscription');
        trySubscribe();
      }
    });

    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      appStateSub.remove();
      echoUnsubscribe();
      destroyEchoInstance();
    };
  }, [trySubscribe]);
}

// Call Manager Hook
const BASE_URL = 'https://apis.staffoo.com.au';

async function apiPost(endpoint: string, body: object = {}) {
  let token = await AsyncStorage.getItem('@auth_token');
  if (!token) token = await AsyncStorage.getItem('auth_token');
  if (!token) token = await AsyncStorage.getItem('@token');

  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  const isCurrentlyInCall = _state.inCall || !!_state.incoming || !!_state.outgoing;

    const initiateCall = async (user: { id: string | number; name: string }) => {
    if (!user?.id) {
      Toast.show({ type: 'error', text1: 'Invalid user' });
      return;
    }
    if (isCurrentlyInCall) {
      Toast.show({ type: 'error', text1: 'Already in a call' });
      return;
    }

    try {
      setIsCalling(true);
      const initRes = await apiPost('api/calls/initiate', { receiver_id: user.id });

      if (!initRes?.success || !initRes?.call) {
        Toast.show({ type: 'error', text1: initRes?.error || 'Failed to initiate call' });
        return;
      }

      const channelName = initRes.call.channel_name ?? initRes.agora_config?.channel_name;
      const uid = initRes.agora_config?.uid ?? Math.floor(Math.random() * 100000);

      const tokenRes = await apiPost('api/agora/token', { channel_name: channelName, uid });

      if (!tokenRes?.token) {
        Toast.show({ type: 'error', text1: 'Failed to get token' });
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
      console.error('[CallManager] initiateCall error:', err);
      Toast.show({ type: 'error', text1: err.message || 'Call initiation failed' });
    } finally {
      setIsCalling(false);
    }
  };


  const acceptIncomingCall = async (currentUserId?: string | number): Promise<AgoraConfig | null> => {
    const incoming = _state.incoming;
    if (!incoming) return null;

    try {
      const callId = incoming.call_id ?? incoming.callId;
      const acceptRes = await apiPost(`api/calls/accept/${callId}`, { 
        call_id: callId,
        callId: callId 
      });

      if (!acceptRes?.success) {
        Toast.show({ type: 'error', text1: acceptRes?.error || 'Failed to accept' });
        return null;
      }

      const channelName = 
        acceptRes?.call?.channel_name || 
        acceptRes?.call?.channelName || 
        incoming.channel_name || 
        incoming.roomName;

      // Ensure UID is a valid positive integer for Agora
      let uid = Number(currentUserId);
      if (isNaN(uid) || uid <= 0) {
        uid = Math.floor(Math.random() * 100000) + 1000;
      }
      
      console.log(`[CallManager] Fetching token for channel: ${channelName}, uid: ${uid}`);

      const tokenRes = await apiPost('api/agora/token', { channel_name: channelName, uid });
      if (!tokenRes?.token) return null;

      return {
        appId: tokenRes.app_id ?? AGORA_APP_ID,
        channel: channelName,
        token: tokenRes.token,
        uid: tokenRes.uid ?? uid,
      };
    } catch (err: any) {
      console.error('[CallManager] accept error:', err);
      Toast.show({ type: 'error', text1: 'Accept call failed' });
      return null;
    }
  };

  const endCall = useCallback(async (isReject = false, manualCallId?: string | number) => {
    const activeCallId = manualCallId ?? _state.incoming?.call_id ?? _state.outgoing?.callId;
    
    console.log(`[CallManager] endCall logic (reject: ${isReject}, id: ${activeCallId})`);

    // Reset global state immediately
    setCallState({ incoming: null, outgoing: null, inCall: false });

    if (activeCallId) {
      const endpoint = isReject ? `api/calls/reject/${activeCallId}` : `api/calls/end/${activeCallId}`;
      console.log(`[CallManager] 📤 SENDING END CALL API: ${endpoint}`);
      apiPost(endpoint).catch((e) => console.error('[CallManager] ❌ End call API error:', e));
    } else {
      console.warn('[CallManager] ⚠️ No activeCallId found to end call on server');
    }
  }, []);

  return { initiateCall, acceptIncomingCall, endCall, isCalling, isCurrentlyInCall };
}