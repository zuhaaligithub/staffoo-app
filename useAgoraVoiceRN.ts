
import { useEffect, useRef, useState, useCallback } from 'react';
import RtcEngine ,{
  createAgoraRtcEngine,
  IRtcEngine,
  
  ChannelProfileType,
  ClientRoleType,
  RtcConnection,
  AudioScenarioType,
} from 'react-native-agora';
import { Platform, PermissionsAndroid } from 'react-native';

export type CallStatus = 'idle' | 'joining' | 'in-call' | 'error' | 'failed';

export function useAgoraVoiceRN() {
  const engineRef = useRef<IRtcEngine | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const initEngine = useCallback((appId: string): IRtcEngine => {
    if (engineRef.current) return engineRef.current;

    console.log('[Agora] 🚀 Initializing Agora Engine');

    const engine = createAgoraRtcEngine();
    engine.initialize({ 
      appId: appId,
      audioScenario: AudioScenarioType.AudioScenarioDefault 
    });

    engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    // Audio setup
    engine.enableAudio();
    engine.enableLocalAudio(true);
    engine.setDefaultAudioRouteToSpeakerphone(true);
    engine.setEnableSpeakerphone(true);
    
    // Enable volume indication for debugging
    engine.enableAudioVolumeIndication(250, 3, true);

    console.log('[Agora] 🔊 Audio initialized with speakerphone and volume monitoring');

    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    // Strong debugging event handlers
    engine.registerEventHandler({
      onJoinChannelSuccess: (connection: RtcConnection, elapsed: number) => {
        console.log(`[Agora] ✅ SUCCESSFULLY JOINED CHANNEL!`);
        console.log(`     Channel: ${connection.channelId}`);
        console.log(`     Local UID: ${connection.localUid}`);
        console.log(`     Elapsed: ${elapsed}ms`);
        
        // Force audio on join
        if (engineRef.current) {
          engineRef.current.enableLocalAudio(true);
          engineRef.current.muteLocalAudioStream(false);
          engineRef.current.muteAllRemoteAudioStreams(false);
          engineRef.current.setEnableSpeakerphone(true);
        }
        
        setCallStatus('in-call');
      },

      onUserJoined: (_connection, remoteUid: number) => {
        console.log(`[Agora] 👤 Remote user joined: ${remoteUid}`);
        setRemoteUsers(prev => prev.includes(remoteUid) ? prev : [...prev, remoteUid]);
      },

      onUserOffline: (_connection, remoteUid: number) => {
        console.log(`[Agora] ❌ Remote user left: ${remoteUid}`);
        setRemoteUsers(prev => prev.filter(uid => uid !== remoteUid));
      },

      onRemoteAudioStateChanged: (_connection, remoteUid, state, reason, elapsed) => {
        console.log(`[Agora] 🔊 Remote Audio | UID: ${remoteUid} | State: ${state} | Reason: ${reason}`);
      },

      onLocalAudioStateChanged: (_connection, state, error) => {
        console.log(`[Agora] 🎤 Local Audio | State: ${state} | Error: ${error}`);
      },

      onAudioRoutingChanged: (routing: number) => {
        console.log(`[Agora] 🔈 Audio Routing Changed: ${routing} (3=Speaker, 1=Earpiece)`);
      },

      onAudioVolumeIndication: (_connection, speakers, speakerNumber, totalVolume) => {
        if (totalVolume > 0) {
          console.log(`[Agora] 🔈 Volume: ${totalVolume} (Speakers: ${speakerNumber})`);
        }
      },

      onError: (err: number, msg: string) => {
        console.error(`[Agora] ❌ SDK Error Code: ${err} | Message: ${msg}`);
        setCallStatus('error');
      },

    
    });
    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

    engineRef.current = engine;
    return engine;
  }, []);

  const joinCall = useCallback(async (config: { appId: string; channel: string; token: string; uid: number }) => {
    try {
      const safeToken = config.token ? `${config.token.substring(0, 10)}...${config.token.slice(-10)}` : 'MISSING';
      console.log(`[Agora] 🔄 Joining channel: ${config.channel} | UID: ${config.uid} | Token: ${safeToken}`);

      setCallStatus('joining');

      const hasMicPermission = Platform.OS === 'android' 
        ? await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO) === PermissionsAndroid.RESULTS.GRANTED 
        : true;

      if (!hasMicPermission) {
        console.warn('[Agora] ❌ Microphone permission denied');
        setCallStatus('error');
        return;
      }

      // Android 12+ Bluetooth permission
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        await PermissionsAndroid.request('android.permission.BLUETOOTH_CONNECT' as any);
      }

      const engine = initEngine(config.appId);

      // Leave previous channel safely
      try { await engine.leaveChannel(); } catch {}

      await engine.joinChannel(config.token, config.channel, config.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      });

      engine.setEnableSpeakerphone(true);
      console.log('[Agora] Join command sent, speakerphone enabled');
    } catch (err: any) {
      console.error('[Agora] Join failed with exception:', err);
      setCallStatus('error');
    }
  }, [initEngine]);

  const leaveCall = useCallback(async () => {
    console.log('[Agora] 📴 Leaving channel and releasing engine');
    try {
      if (engineRef.current) {
        await engineRef.current.leaveChannel();
        await engineRef.current.release();
        engineRef.current = null;
      }
    } catch (err) {
      console.error('[Agora] ❌ Error during leaveCall:', err);
    } finally {
      setRemoteUsers([]);
      setIsMuted(false);
      setCallStatus('idle');
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (engineRef.current) {
      setIsMuted(prev => {
        const next = !prev;
        console.log(`[Agora] 🎤 Toggling mute: ${prev} -> ${next}`);
        engineRef.current?.muteLocalAudioStream(next);
        return next;
      });
    } else {
      console.warn('[Agora] 🎤 Cannot toggle mute: Engine not initialized');
    }
  }, []);

  // ✅ Cleanup
  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, []);

  return {
    callStatus,        // ← Use this to know current state
    remoteUsers,
    isMuted,
    joinCall,
    leaveCall,
    toggleMute,
  };
}