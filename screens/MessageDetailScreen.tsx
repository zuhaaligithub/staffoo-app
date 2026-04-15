// screens/MessageDetailScreen.tsx
// Your existing MessageDetailScreen with Agora voice call integrated.
// Changes from original are marked with: // ← AGORA

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
  ScrollView,
  Alert,
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
  Smile,
  Send,
} from 'lucide-react-native';
import { getEchoInstance } from '../echo';
import { getAuthToken } from '../services/authApi';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCallManagerRN } from '../useCallManagerRN';

// ← AGORA: import the call manager


type MessageDetailRouteProp = RouteProp<RootStackParamList, 'MessageDetail'>;

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
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const twoDigit = (n: number) => String(n).padStart(2, '0');
  const hour = d.getHours();
  const minute = twoDigit(d.getMinutes());
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  if (isToday) return `${hour12}:${minute} ${ampm}`;
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString();
};

export default function MessageDetailScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['65%', '70%'];

  const openAttachments = () => bottomSheetRef.current?.expand();
  const closeSheet = () => bottomSheetRef.current?.close();

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.4}
      pressBehavior="close"
    />
  );

  const navigation = useNavigation();
  const route = useRoute<MessageDetailRouteProp>();
  const { name = 'Ronald Rich', chatId, conversation: passedConversation } =
    route.params ?? {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);

  // ← AGORA: call manager
  const { initiateCall, isCalling, isCurrentlyInCall } = useCallManagerRN();

  // ← AGORA: tap the phone icon → initiate call to the person in this chat
  const handleCallPress = () => {
    if (!chatId) {
      Alert.alert('Cannot call', 'No user ID available for this conversation.');
      return;
    }
    initiateCall({ id: chatId, name });
  };

  // ── Extract messages helper ──────────────────────────────
  const extractMessagesArray = (res: any) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.messages && Array.isArray(res.messages.data)) return res.messages.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.messages && Array.isArray(res.messages)) return res.messages;
    return [];
  };

  // ── Bootstrap ────────────────────────────────────────────
  useEffect(() => {
    const bootstrap = async () => {
      let localCurrentUserId: string | number | null = null;
      try {
        const cached = await AsyncStorage.getItem('@user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id) { localCurrentUserId = parsed.id; setCurrentUserId(parsed.id); }
        } else {
          const uid = await AsyncStorage.getItem('@user_id');
          if (uid) { localCurrentUserId = uid; setCurrentUserId(uid); }
        }
      } catch (e) {}

      const mapMessage = (m: any) => ({
        id: String(m.id ?? m.message_id ?? Date.now()),
        text: m.message ?? m.text ?? m.body ?? '',
        isMe: m.sender_id === undefined
          ? false
          : String(m.sender_id) === String(localCurrentUserId ?? currentUserId ?? ''),
        time: formatMessageTime(m.created_at || m.time),
      });

      if (passedConversation) {
        const source = extractMessagesArray(passedConversation);
        setMessages(source.map(mapMessage));
      } else if (chatId) {
        setLoading(true);
        try {
          const { getConversation } = await import('../services/authApi');
          const res = await getConversation(chatId);
          const source = extractMessagesArray(res);
          setMessages(source.map(mapMessage));
        } catch (err) {
          console.error('Failed to load conversation:', err);
        } finally {
          setLoading(false);
        }
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
    };

    bootstrap();
  }, []);

  // ── Send message ──────────────────────────────────────────
  const handleSend = () => {
    if (!inputText.trim()) return;
    const send = async () => {
      setSending(true);
      try {
        const { sendMessage, getConversation } = await import('../services/authApi');
        if (!chatId) { console.warn('No chatId'); return; }

        const res = await sendMessage({ receiver_id: chatId as any, message: inputText.trim() });
        const returned = res?.message || res?.data?.message || res?.data || null;
        if (returned) {
          const newMsg = {
            id: String(returned.id ?? returned.message_id ?? Date.now()),
            text: returned.message ?? returned.message_text ?? returned.text ?? inputText.trim(),
            isMe: String(returned.sender_id ?? '') === String(currentUserId ?? ''),
            time: formatMessageTime(returned.created_at || new Date()),
          };
          setMessages(prev => [...prev, newMsg]);
        }

        try {
          const res2 = await getConversation(chatId);
          const source = extractMessagesArray(res2);
          setMessages(
            source.map((m: any) => ({
              id: String(m.id ?? m.message_id ?? Date.now()),
              text: m.message ?? m.text ?? m.body ?? '',
              isMe: m.sender_id === undefined ? false : String(m.sender_id) === String(currentUserId ?? ''),
              time: formatMessageTime(m.created_at || m.time),
            })),
          );
        } catch (e) {}

        setInputText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err) {
        console.error('Send message failed:', err);
      } finally {
        setSending(false);
      }
    };
    send();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <>
      {index === 0 && (
        <View style={styles.dateHeader}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>Today</Text>
          <View style={styles.dateLine} />
        </View>
      )}

      <TouchableOpacity
        onLongPress={() => {
          Alert.alert('Delete message', 'Delete this message?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  const { deleteMessage } = await import('../services/authApi');
                  await deleteMessage(item.id);
                  setMessages(prev => prev.filter(m => m.id !== String(item.id)));
                } catch (e) {
                  Alert.alert('Error', 'Failed to delete message');
                }
              },
            },
          ]);
        }}
        style={[
          styles.messageRow,
          item.isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View style={[styles.bubble, item.isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.messageText, item.isMe && styles.messageTextMe]}>
            {item.text}
          </Text>
        </View>
        <Text style={[styles.timeText, item.isMe ? styles.timeRight : styles.timeLeft]}>
          {item.time}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarInitial}>
              <Text style={styles.avatarInitialText}>
                {(() => {
                  const parts = (name || '').trim().split(/\s+/);
                  const a = parts[0]?.charAt(0) || '';
                  const b = parts[parts.length - 1]?.charAt(0) || '';
                  return (a + b).toUpperCase();
                })()}
              </Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.contactName}>{name}</Text>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {/* ← AGORA: phone button now triggers a real Agora call */}
          <TouchableOpacity
            style={[styles.actionBtn, isCurrentlyInCall && styles.actionBtnActive]}
            onPress={handleCallPress}
            disabled={isCalling}
          >
            <Phone size={22} color={isCurrentlyInCall ? '#2EB1E2' : '#000'} />
          </TouchableOpacity>

          {/* <TouchableOpacity style={styles.actionBtn} onPress={openAttachments}>
            <MoreVertical size={22} color="#000" />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputBar}>
          {/* <TouchableOpacity style={styles.inputBtn} onPress={openAttachments}>
            <Paperclip size={24} color="#64748b" />
          </TouchableOpacity> */}
          {/* <TouchableOpacity style={styles.inputBtn}>
            <Smile size={24} color="#64748b" />
          </TouchableOpacity> */}
          <TextInput
            style={styles.textInput}
            placeholder="Type message..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Send size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Attachments Bottom Sheet (unchanged from original) */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Attachments</Text>
            <TouchableOpacity onPress={closeSheet} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>LATEST PHOTOS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
            <Image source={require('../assets/blog1.jpg')} style={styles.photoThumb} />
            <Image source={require('../assets/blog2.jpg')} style={styles.photoThumb} />
            <Image source={require('../assets/blog3.jpg')} style={styles.photoThumb} />
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>OTHER FILES</Text>
          <View style={styles.filesList}>
            {[
              { bg: '#DBEAFE', icon: '↓', name: 'Project Brief v1.docx', size: '132.5 KB' },
              { bg: '#E0F2FE', icon: '📊', name: '32 Excel Sheets', size: '12.5 MB' },
              { bg: '#F3E8FF', icon: '📄', name: '60 PDF presentations', size: '28.5 MB' },
              { bg: '#FEF3C7', icon: '🎥', name: 'Explanation Video.mp4', size: '80 MB' },
            ].map(f => (
              <View key={f.name} style={styles.fileItem}>
                <View style={[styles.fileIconContainer, { backgroundColor: f.bg }]}>
                  <Text style={styles.fileIcon}>{f.icon}</Text>
                </View>
                <View>
                  <Text style={styles.fileName}>{f.name}</Text>
                  <Text style={styles.fileSize}>{f.size}</Text>
                </View>
              </View>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ── Styles (identical to original + one addition) ─────────
const styles = StyleSheet.create({
  safeArea:          { flex: 1, backgroundColor: '#f8fafc' },
  keyboardAvoid:     { flex: 1 },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 25, backgroundColor: '#ffffff', borderBottomColor: '#e2e8f0' },
  backBtn:           { padding: 8 },
  profileContainer:  { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  avatarContainer:   { position: 'relative' },
  avatarInitial:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2EB1E2', justifyContent: 'center', alignItems: 'center' },
  avatarInitialText: { color: '#ffffff', fontWeight: '700' },
  onlineDot:         { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#ffffff' },
  nameContainer:     { marginLeft: 12 },
  contactName:       { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  onlineText:        { fontSize: 13, color: '#64748b' },
  actions:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn:         { padding: 8 },
  // ← AGORA: highlight phone button when in a call
  actionBtnActive:   { backgroundColor: '#ede9fe', borderRadius: 20 },
  listContent:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  dateHeader:        { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dateLine:          { flex: 1, height: 1, backgroundColor: '#cbd5e1' },
  dateLabel:         { paddingHorizontal: 16, fontSize: 13, color: '#64748b', fontWeight: '500' },
  messageRow:        { marginVertical: 6, maxWidth: '80%' },
  messageRowLeft:    { alignSelf: 'flex-start' },
  messageRowRight:   { alignSelf: 'flex-end' },
  bubble:            { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 },
  bubbleMe:          { backgroundColor: '#2EB1E2', borderBottomRightRadius: 6 },
  bubbleOther:       { backgroundColor: '#e2e8f0', borderBottomLeftRadius: 6 },
  messageText:       { fontSize: 15.5, lineHeight: 21, color: '#0f172a' },
  messageTextMe:     { color: '#ffffff' },
  timeText:          { fontSize: 11, color: '#64748b', marginTop: 4 },
  timeLeft:          { alignSelf: 'flex-end' },
  timeRight:         { alignSelf: 'flex-end' },
  inputBar:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  inputBtn:          { padding: 10 },
  textInput:         { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#f1f5f9', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 8, fontSize: 16, color: '#0f172a' },
  sendBtn:           { backgroundColor: '#2EB1E2', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sheetBackground:   { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  handleIndicator:   { backgroundColor: '#D1D5DB', width: 48, height: 5, borderRadius: 3 },
  sheetContent:      { flex: 1, paddingHorizontal: 24 },
  sheetHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  sheetTitle:        { fontSize: 22, fontWeight: '700', color: '#111827' },
  closeButton:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  closeText:         { fontSize: 24, color: '#374151', fontWeight: 'bold' },
  sectionTitle:      { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 6, letterSpacing: 0.5 },
  photosContainer:   { marginBottom: 0 },
  photoThumb:        { width: 90, height: 90, borderRadius: 16, marginRight: 16 },
  filesList:         { gap: 10 },
  fileItem:          { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fileIconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  fileIcon:          { fontSize: 24 },
  fileName:          { fontSize: 16, fontWeight: '500', color: '#111827' },
  fileSize:          { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
