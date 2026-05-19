import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { ChevronLeft, Search } from 'lucide-react-native';
import { CheckCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import BottomTab from './BottomTab';
import { getConversations } from '../services/authApi';

const BASE_URL = 'https://apis.staffoo.com.au/api';

type ChatUser = {
  id: string | number;
  name: string;
  avatar?: any;
  lastMessage?: string;
  timeRaw?: string | number;
  unread?: number;
  online?: boolean;
  seen?: boolean;
};

type Props = { navigation: any };

const formatMessageRuntime = (value?: string | number | Date) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;

  if (isToday) return `${hour12}:${minute} ${ampm}`;
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString();
};

const getLatestMessageItem = (item: any) => {
  if (!item) return null;

  if (item.last_message) return item.last_message;
  if (item.message) return item.message;
  if (Array.isArray(item.messages?.data) && item.messages.data.length > 0)
    return item.messages.data[item.messages.data.length - 1];
  if (Array.isArray(item.messages) && item.messages.length > 0)
    return item.messages[item.messages.length - 1];
  if (Array.isArray(item.data) && item.data.length > 0)
    return item.data[item.data.length - 1];

  return item;
};

const getMessageText = (item: any) => {
  const last = getLatestMessageItem(item);
  if (!last) return '';
  if (typeof last === 'string') return last;
  return (
    last.message ||
    last.text ||
    last.body ||
    last.note ||
    last.description ||
    ''
  );
};

const getMessageTimestamp = (item: any) => {
  const last = getLatestMessageItem(item);
  return (
    last?.created_at ||
    last?.updated_at ||
    last?.time ||
    last?.date ||
    item?.last_message_time ||
    item?.updated_at ||
    item?.created_at ||
    ''
  );
};

const getChatUnreadCount = (item: any) => {
  if (typeof item.unread_count === 'number') return item.unread_count;
  if (typeof item.unread === 'number') return item.unread;
  const messagesArray = item.messages?.data || item.messages || item.data;
  if (Array.isArray(messagesArray)) {
    return messagesArray.filter(
      (m: any) =>
        m &&
        (m.is_read === false || m.read_at === null || m.read_at === undefined),
    ).length;
  }
  return 0;
};

export default function MessageScreen({ navigation }: Props) {
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Main function: Call getConversations() + filter Admin chats
  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await getConversations();
      const rawConvs = res?.data?.data || res?.data || res || [];
      const convs = Array.isArray(rawConvs)
        ? rawConvs
        : Array.isArray(rawConvs.data)
        ? rawConvs.data
        : [];

      const formatted: ChatUser[] = convs
        .map((item: any) => {
          const user =
            item.user || item.receiver || item.sender || item.admin || {};

          // Only show if it's Admin (adjust this condition if needed)
          const isAdmin =
            user?.user_type === 'admin' ||
            user?.email?.toLowerCase().includes('admin') ||
            user?.name?.toLowerCase().includes('admin') ||
            item?.is_admin === true;

          if (!isAdmin) return null;

          return {
            id: user?.id ?? item?.id,
            name: user?.name || user?.full_name || 'Admin',
            avatar: user?.avatar ? { uri: user.avatar } : undefined,
            lastMessage: getMessageText(item) || 'No messages yet',
            timeRaw: getMessageTimestamp(item),
            unread: getChatUnreadCount(item),
            online: user?.is_online || false,
            seen: getLatestMessageItem(item)?.is_sent_by_me ?? false,
          };
        })
        .filter(Boolean);

      setChats(formatted);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchChats);
    return unsub;
  }, [navigation]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && chats.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0A7C6E" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : filteredChats.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No matching conversations found'
                : 'No conversations yet'}
            </Text>
          </View>
        ) : (
          filteredChats.map(chat => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              onPress={() => {
                navigation.navigate('MessageDetail', {
                  chatId: chat.id,
                  name: chat.name,
                });
              }}
            >
              <View style={styles.avatarContainer}>
                {chat.avatar ? (
                  <Image source={chat.avatar} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarInitial}>
                    <Text style={styles.avatarInitialText}>
                      {chat.name?.charAt(0)?.toUpperCase() || 'A'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.chatInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text
                    style={{ color: '#0A7C6E', fontSize: 13, marginLeft: 4 }}
                  >
                    (Admin)
                  </Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {chat.lastMessage || 'No messages yet'}
                </Text>
              </View>

              <View style={styles.rightColumn}>
                <Text style={styles.timeText}>
                  {formatMessageRuntime(chat.timeRaw)}
                </Text>
                {Number(chat.unread) > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>
                      {String(chat.unread)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomTab navigation={navigation} activeTab="Messages" />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dfe6f9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0A7C6E',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },

  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },

  scrollView: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: { marginTop: 12, color: '#6B7280' },
  emptyText: { color: '#6B7280', fontSize: 16 },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarInitial: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0A7C6E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  chatInfo: { flex: 1, marginLeft: 14 },
  chatName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  lastMessage: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  rightColumn: { alignItems: 'flex-end', minWidth: 70 },
  timeText: { fontSize: 12, color: '#6B7280' },
  unreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  unreadCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
