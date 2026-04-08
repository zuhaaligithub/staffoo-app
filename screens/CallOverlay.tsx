
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Vibration,
  Platform,
  Animated,
} from 'react-native';
import { Phone, PhoneOff, Mic, MicOff, Bell } from 'lucide-react-native';
import { useCallSession } from '../useCallManagerRN';
import { useCallManagerRN } from '../useCallManagerRN';
import { useAgoraVoiceRN } from '../useAgoraVoiceRN';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundPlayer from 'react-native-sound-player';

function PulseRing({ color }: { color: string }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);

  return (
    <Animated.View
      style={[styles.pulseRing, { borderColor: color, transform: [{ scale }] }]}
    />
  );
}

export default function CallOverlay() {
  const {
    incomingCall,
    outgoingCall,
    inCall: sessionInCall,
    clearSession,
    setInCall,
  } = useCallSession();
  const {
    joinCall,
    leaveCall,
    toggleMute,
    isMuted,
    remoteUsers,
    callStatus,
  } = useAgoraVoiceRN();
  const { acceptIncomingCall, endCall } = useCallManagerRN();
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasConnectedToRemote, setHasConnectedToRemote] = useState(false);
  const callData = incomingCall || outgoingCall;
  const isIncoming = !!incomingCall;
  const isInActiveCall = callStatus === 'in-call' || sessionInCall;
  const visible = !!callData;
  useEffect(() => {
    if (isInActiveCall && remoteUsers.length > 0) {
      setHasConnectedToRemote(true);
    }
  }, [remoteUsers, isInActiveCall]);
  useEffect(() => {
    if (!isIncoming && outgoingCall?.agoraConfig && callStatus === 'idle') {
      console.log('[CallOverlay] Auto-joining outgoing call');
      joinCall(outgoingCall.agoraConfig).catch((err) =>
        console.error('[CallOverlay] Auto-join failed:', err)
      );
    }
  }, [isIncoming, outgoingCall, callStatus, joinCall]);

  useEffect(() => {
    let soundInterval: any;
    if (isIncoming && !isInActiveCall && !isAccepting) {
      console.log('[CallOverlay] 🔔 Incoming call! Starting sound & vibration');
      Vibration.vibrate([0, 800, 400], true);
      try {
        SoundPlayer.stop();
        const callAsset = require('../assets/call.mp3');
        SoundPlayer.playAsset(callAsset);
        soundInterval = setInterval(() => {
          SoundPlayer.stop();
          SoundPlayer.playAsset(callAsset);
        }, 3000); 
      } catch (e) {
        console.error('[CallOverlay] ❌ Sound error:', e);
      }
    } else {
      console.log('[CallOverlay] 🔇 Stopping sound & vibration');
      Vibration.cancel();
      try {
        SoundPlayer.stop();
      } catch (e) {}
    }

    return () => {
      Vibration.cancel();
      if (soundInterval) clearInterval(soundInterval);
      try {
        SoundPlayer.stop();
      } catch (e) {}
    };
  }, [isIncoming, isInActiveCall, isAccepting]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    setIsAccepting(true);
    Vibration.cancel();
    try {
      const currentUserId = await AsyncStorage.getItem('@user_id');
      console.log('[CallOverlay] Accepting call for userId:', currentUserId);
      const config = await acceptIncomingCall(currentUserId ?? undefined);
      if (config) {
        console.log('[CallOverlay] Got Agora config, joining channel...');
        await joinCall(config);
        setInCall(true);
      } else {
        console.warn('[CallOverlay] Accept returned no config');
      }
    } catch (err) {
      console.error('[CallOverlay] Accept failed:', err);
    } finally {
      setIsAccepting(false);
    }
  }, [incomingCall, acceptIncomingCall, joinCall, setInCall]);

  const handleEndCall = useCallback(async (isReject = false) => {
    const currentCallId = incomingCall?.call_id ?? outgoingCall?.callId;
    console.log(`[CallOverlay] handleEndCall called (id: ${currentCallId}, reject: ${isReject})`);
    Vibration.cancel();
    clearSession();
    setHasConnectedToRemote(false);
    leaveCall().catch(e => console.error('Leave call error:', e));
    endCall(isReject, currentCallId).catch(e => console.error('End call API error:', e));
  }, [incomingCall, outgoingCall, clearSession, leaveCall, endCall]);


  useEffect(() => {
    if (isInActiveCall && hasConnectedToRemote && remoteUsers.length === 0) {
      console.log('[CallOverlay] Remote user left AFTER connection → ending call');
      handleEndCall(false);
    }
  }, [remoteUsers, isInActiveCall, hasConnectedToRemote, handleEndCall]);

  if (!visible) return null;

  if (isInActiveCall) {
    const isWaiting = !isIncoming && remoteUsers.length === 0;
    const name = callData?.receiverName || callData?.callerName || 'User';
    return (
      <Modal transparent visible animationType="fade" statusBarTranslucent>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.avatarWrapper}>
              {isWaiting && <PulseRing color="#f59e0b" />}
              <View
                style={[
                  styles.avatar,
                  isWaiting ? styles.avatarWaiting : styles.avatarConnected,
                ]}
              >
                <Phone size={32} color="#fff" />
              </View>
            </View>

            <Text style={styles.title}>{isWaiting ? 'Ringing...' : 'In Call'}</Text>
            <Text style={styles.subtitle}>
              {isWaiting ? `Waiting for ${name}...` : 'Connected'}
            </Text>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlBtn, isMuted ? styles.mutedBtn : styles.outlineBtn]}
                onPress={toggleMute}
              >
                {isMuted ? (
                  <MicOff size={22} color="#fff" />
                ) : (
                  <Mic size={22} color="#64748b" />
                )}
                <Text style={[styles.controlLabel, isMuted && styles.controlLabelWhite]}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, styles.endBtn]}
                onPress={() => handleEndCall(false)}
              >
                <PhoneOff size={22} color="#fff" />
                <Text style={[styles.controlLabel, styles.controlLabelWhite]}>End</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (isIncoming) {
    const callerName =
      incomingCall.callerName ||
      incomingCall.staffName ||
      'Someone';

    return (
      <Modal transparent visible animationType="slide" statusBarTranslucent>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.avatarWrapper}>
              <PulseRing color="#22c55e" />
              <View style={[styles.avatar, styles.avatarIncoming]}>
                <Bell size={34} color="#fff" />
              </View>
            </View>
            <Text style={styles.title}>Incoming Call</Text>
            <Text style={styles.subtitle}>{callerName} is calling you...</Text>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlBtn, styles.endBtn]}
                onPress={() => handleEndCall(true)}
                disabled={isAccepting}
              >
                <PhoneOff size={22} color="#fff" />
                <Text style={[styles.controlLabel, styles.controlLabelWhite]}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, styles.acceptBtn]}
                onPress={handleAccept}
                disabled={isAccepting}
              >
                <Phone size={22} color="#fff" />
                <Text style={[styles.controlLabel, styles.controlLabelWhite]}>
                  {isAccepting ? 'Connecting...' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    width: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIncoming: { backgroundColor: '#22c55e' },
  avatarWaiting: { backgroundColor: '#f59e0b' },
  avatarConnected: { backgroundColor: '#22c55e' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  endBtn: { backgroundColor: '#ef4444' },
  acceptBtn: { backgroundColor: '#22c55e' },
  outlineBtn: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  mutedBtn: { backgroundColor: '#f59e0b' },
  controlLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  controlLabelWhite: { color: '#fff' },
});

