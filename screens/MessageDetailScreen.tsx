

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

import {
  ChevronLeft,
  Phone,
  MoreVertical,
  Paperclip,
  Send,
} from 'lucide-react-native';
import { getEchoInstance } from '../echo';
import { getAuthToken } from '../services/authApi';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCallManagerRN } from '../useCallManagerRN';

type MessageDetailRouteProp = RouteProp<RootStackParamList, 'MessageDetail'>;
const COLORS = {
  // 🌿 Primary Brand
  primary: '#89E7D0', // mint accent
  primaryDark: '#4FCBB3',

  // 🌙 Background system (clean dark navy)
  background: '#001F3F',
  surface: '#20b72c',
  surface2: '#12243A',

  // ✨ Card / Glass
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',

  // ✍️ Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',

  // 🔴🟡🟢 Status
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Border
  border: 'rgba(255,255,255,0.08)',
};
type Message = {
  id: string;
  text: string;
  isMe: boolean;
  time: string;
};

const formatMessageTime = (value?: string | number | Date) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;

  if (isToday) return `${hour12}:${minute} ${ampm}`;
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString();
};

export default function MessageDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<MessageDetailRouteProp>();
  const {
    name = 'Admin',
    chatId,
    conversation: passedConversation,
  } = route.params ?? {};

  const bottomSheetRef = useRef<BottomSheet>(null);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(
    null,
  );
  const [callLoading, setCallLoading] = useState(false);

  const { initiateCall, isCurrentlyInCall } = useCallManagerRN();

  const snapPoints = ['65%', '70%'];

  // Handle Call
  const handleCallPress = async () => {
    if (!chatId) {
      Alert.alert('Cannot Call', 'No user ID available for this conversation.');
      return;
    }
    if (isCurrentlyInCall) {
      Alert.alert('Already in Call', 'You are currently in another call.');
      return;
    }

    setCallLoading(true);
    try {
      await initiateCall({ id: chatId, name });
    } catch (error: any) {
      Alert.alert('Call Failed', error?.message || 'Failed to start the call.');
    } finally {
      setCallLoading(false);
    }
  };

  // Inside MessageDetailScreen.tsx

  // Updated helper to match your actual API response
  const extractMessagesArray = (res: any) => {
    if (!res) return [];

    // New structure: res.messages.data
    if (res.messages?.data && Array.isArray(res.messages.data)) {
      return res.messages.data;
    }

    // Fallbacks
    if (Array.isArray(res)) return res;
    if (res.data?.data) return res.data.data;
    if (res.data) return Array.isArray(res.data) ? res.data : [];
    if (res.messages) return Array.isArray(res.messages) ? res.messages : [];

    return [];
  };

  // Updated mapping function
  const mapMessage = (
    m: any,
    currentUserId: string | number | null,
  ): Message => ({
    id: String(m.id ?? Date.now()),
    text: m.message?.trim() || '',
    isMe: String(m.sender_id ?? '') === String(currentUserId),
    time: formatMessageTime(m.created_at),
  });

  useEffect(() => {
    const bootstrap = async () => {
      let userId: string | number | null = null;
      try {
        const cached = await AsyncStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          userId = parsed?.id;
          setCurrentUserId(parsed?.id);
        }
      } catch (e) {}

      if (passedConversation) {
        const source = extractMessagesArray(passedConversation);
        setMessages(source.map((m: any) => mapMessage(m, userId)));
      } else if (chatId) {
        setLoading(true);
        try {
          const { getConversation } = await import('../services/authApi');
          const res = await getConversation(chatId);
          const source = extractMessagesArray(res);
          setMessages(source.map((m: any) => mapMessage(m, userId)));
        } catch (err) {
          console.error('Failed to load conversation:', err);
        } finally {
          setLoading(false);
        }
      }

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: false }),
        150,
      );
    };

    bootstrap();
  }, [chatId, passedConversation]);

  // Send Message
  const handleSend = async () => {
    if (!inputText.trim() || !chatId) return;

    setSending(true);
    try {
      const { sendMessage, getConversation } = await import(
        '../services/authApi'
      );

      await sendMessage({
        receiver_id: chatId as any,
        message: inputText.trim(),
      });

      // Refresh messages
      const res = await getConversation(chatId);
      const source = extractMessagesArray(res);
      setMessages(
        source.map((m: any) => ({
          id: String(m.id ?? Date.now()),
          text: m.message ?? m.text ?? '',
          isMe: String(m.sender_id ?? '') === String(currentUserId),
          time: formatMessageTime(m.created_at),
        })),
      );

      setInputText('');
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    } catch (err) {
      console.error('Send failed:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageRow,
        item.isMe ? styles.messageRowRight : styles.messageRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          item.isMe ? styles.bubbleMe : styles.bubbleOther,
        ]}
      >
        <Text style={[styles.messageText, item.isMe && styles.messageTextMe]}>
          {item.text}
        </Text>
      </View>
      <Text
        style={[
          styles.timeText,
          item.isMe ? styles.timeRight : styles.timeLeft,
        ]}
      >
        {item.time}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ChevronLeft size={28} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarInitial}>
              <Text style={styles.avatarInitialText}>
                {name?.charAt(0)?.toUpperCase() || 'A'}
              </Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.contactName}>{name}</Text>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCallPress}
          disabled={callLoading}
        >
          {callLoading ? (
            <ActivityIndicator size="small" color="#0A7C6E" />
          ) : (
          <Phone size={24} color={COLORS.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Messages Area */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send size={22} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Attachments Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['65%', '70%']}
        enablePanDownToClose
        backdropComponent={BottomSheetBackdrop}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Attachments</Text>
            <TouchableOpacity onPress={() => bottomSheetRef.current?.close()}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* You can expand this section later */}
          <Text style={styles.sectionTitle}>Coming Soon</Text>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safeArea: {
  flex: 1,
  // backgroundColor: COLORS.background,
   backgroundColor: '#111111',
},
  keyboardAvoid: { flex: 1 },

 header: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 16,

  marginHorizontal: 16,
  marginTop: 10,
  marginBottom: 10,

  borderRadius: 20,

  backgroundColor: COLORS.surface2,

  borderWidth: 1,
  borderColor: COLORS.border,
},
  backBtn: { padding: 8 },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarContainer: { position: 'relative' },
  avatarInitial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
  backgroundColor: COLORS.success,
borderColor: COLORS.surface2,
    borderWidth: 2,
   
  },
  nameContainer: { marginLeft: 12 },
 contactName: {
  fontSize: 17,
  fontWeight: '700',
  color: COLORS.text,
},
  onlineText: {
  fontSize: 13,
  color: COLORS.primary,
},
  actionBtn: { padding: 10 },

 listContent: {
  padding: 16,
  paddingBottom: 90,
},
  messageRow: { marginVertical: 6, maxWidth: '80%' },
  messageRowLeft: { alignSelf: 'flex-start' },
  messageRowRight: { alignSelf: 'flex-end' },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 },
bubbleMe: {
  backgroundColor: COLORS.primaryDark,
  borderBottomRightRadius: 4,
},
bubbleOther: {
  backgroundColor: COLORS.surface2,
  borderBottomLeftRadius: 4,

  borderWidth: 1,
  borderColor: COLORS.border,
},
messageText: {
  fontSize: 15.5,
  lineHeight: 21,
  color: COLORS.text,
},
  messageTextMe: { color: '#ffffff' },
 timeText: {
  fontSize: 11,
  color: COLORS.textMuted,
  marginTop: 4,
},
  timeLeft: { alignSelf: 'flex-start' },
  timeRight: { alignSelf: 'flex-end' },

inputBar: {
  flexDirection: 'row',
  alignItems: 'center',

  backgroundColor: COLORS.surface2,

  marginHorizontal: 16,
  marginBottom: 14,
  marginTop: 10,

  padding: 10,

  borderRadius: 24,

  borderWidth: 1,
  borderColor: COLORS.border,
},
 textInput: {
  flex: 1,
  minHeight: 44,

  backgroundColor: 'rgba(255,255,255,0.06)',

  borderRadius: 22,

  paddingHorizontal: 16,
  paddingVertical: 10,

  fontSize: 16,
  color: COLORS.text,

  marginRight: 8,
},
  sendBtn: {
    backgroundColor: COLORS.primaryDark,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

sheetBackground: {
  backgroundColor: COLORS.surface2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetContent: { flex: 1, padding: 20 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
 sheetTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: COLORS.text,
},
  closeText: { fontSize: 28, color: '#64748b' },
sectionTitle: {
  fontSize: 14,
  color: COLORS.textSecondary,
  marginBottom: 10,
},
});
