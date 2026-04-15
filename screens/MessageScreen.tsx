

import React, { useState, useEffect, useRef } from 'react';
import { RefreshControl } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  ChevronLeft,
  Search,
  MoreVertical,
  Plus,
  ArrowLeft,
} from 'lucide-react-native';
import { CheckCheck } from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import BottomTab from './BottomTab';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStaff, getCustomers, getContractor, getContractors, readAllMessages, getConversation, getConversations, getAuthToken } from '../services/authApi';
import { destroyEchoInstance, getEchoInstance } from '../echo';
import { TextInput } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type ChatUser = {
  id: string | number;
  name: string;
  avatar?: any;
  lastMessage?: string;
  timeRaw?: string | number;
  time?: string;
  unread?: number;
  online?: boolean;
  seen?: boolean;
  type?: 'staff' | 'customer' | 'contractor';
};

type StaffUser = {
  id: string | number;
  name?: string;
  full_name?: string;
  email?: string;
  user_email?: string;
};

type Props = { navigation: any };



// Show live runtime for chats: 'Just now', '5m', 'HH:MM', 'Yesterday', or date
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



function RoleSelectionView({
  onSelect,
  userType,
}: {
  onSelect: (type: 'staff' | 'customer' | 'contractor') => void;
  userType: string | null;
}) {
  const allCards = [
    {
      type: 'staff' as const,
      color: '#2EB1E2',
      icon: '👥',
      label: 'STAFF',
      title: 'Staff',
      subtitle: 'Chat with your team members in real-time',
    },
    {
      type: 'customer' as const,
      color: '#2EB1E2',
      icon: '👤',
      label: 'CUSTOMERS',
      title: 'Customers',
      subtitle: 'Handle customer conversations',
    },
    {
      type: 'contractor' as const,
      color: '#2EB1E2',
      icon: '⛑️',
      label: 'CONTRACTORS',
      title: 'Contractors',
      subtitle: 'Collaborate with contractors',
    },
  ];

  let cards = [];

  if (userType === 'staff') {
    // staff → only contractor
    cards = allCards.filter(c => c.type === 'contractor');
  } else if (userType === 'contractor') {
    // contractor → staff + customer
    cards = allCards.filter(
      c => c.type === 'staff' || c.type === 'customer'
    );
  } else if (userType === 'customer') {
    // customer → only contractor
    cards = allCards.filter(c => c.type === 'contractor');
  } else {
    // fallback (optional)
    cards = allCards;
  }

  const getSubtitle = () => {
    if (userType === 'staff') {
      return 'Select contractor to start conversation';
    } else if (userType === 'contractor') {
      return 'Select staff or customer to chat with';
    } else if (userType === 'customer') {
      return 'Select contractor to start conversation';
    }
    return 'Select who you want to chat with';
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={roleStyles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={roleStyles.heading}>New Conversation</Text>
      <Text style={roleStyles.subheading}>
        {getSubtitle()}
      </Text>

      {cards.map((card) => (
        <View key={card.type} style={roleStyles.card}>
          {/* Colored top section */}
          <LinearGradient
            colors={['#36D1DC', '#5B86E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={roleStyles.cardTop}
          >
            <View style={roleStyles.iconCircle}>
              <Text style={roleStyles.icon}>{card.icon}</Text>
            </View>
            <Text style={roleStyles.cardLabel}>{card.label}</Text>
          </LinearGradient>

          {/* White bottom section */}
          <View style={roleStyles.cardBottom}>
            <Text style={roleStyles.cardTitle}>{card.title}</Text>
            <Text style={roleStyles.cardSubtitle}>{card.subtitle}</Text>
            <TouchableOpacity
              style={roleStyles.accessBtn}
              activeOpacity={0.85}
              onPress={() => onSelect(card.type)}
            >
              <Text style={roleStyles.accessBtnText}>Access Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function MessageScreen({ navigation }: Props) {
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [allChats, setAllChats] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // forces rerender for live runtimes
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // ✅ NEW: Controls whether we show the card picker or the chat list
  const [activeFilter, setActiveFilter] = useState<'staff' | 'customer' | 'contractor' | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['65%', '70%'];
  const closeSheet = () => bottomSheetRef.current?.close();

  // staff sheet ref (FAB -> list)
  const staffSheetRef = useRef<BottomSheet>(null);
  const staffSnap = ['65%', '85%'];
  const closeStaffSheet = () => staffSheetRef.current?.close();

  // staff list state (shown in FAB bottom sheet)
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const filteredList = React.useMemo(() => {
    if (!searchQuery.trim()) return staffList;

    const query = searchQuery.toLowerCase().trim();

    return staffList.filter((item: StaffUser) => {
      const name = (item.name || item.full_name || '').toLowerCase();
      const email = (item.email || item.user_email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [staffList, searchQuery]);

  // Load user type
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          setUserType(parsed.user_type);
          setCurrentUserId(parsed.id ?? parsed?.data?.id ?? null);
        }
      } catch (e) {
        console.log('Failed to load user type');
      }
    };
    loadUser();
  }, []);

  // Fetch all three categories
  const fetchAllChats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use conversations endpoint to show only users with recent chats
      const res = await getConversations();
      // responses may vary: try common locations
      const convs = res?.data?.data || res?.data || res?.messages || res || [];
      const arr = Array.isArray(convs) ? convs : [];

      const formatted: ChatUser[] = arr.map((item: any, index: number) => {
        const user = item.user || item.receiver || item.sender || item.user_data || {};
        const last = item.last_message || item.message || item.lastMessage || {};
        return {
          id: user?.id ?? item?.id ?? `conv-${index}`,
          name: user?.name || user?.full_name || item?.name || 'Unknown',
          avatar: user?.avatar ? { uri: user.avatar } : undefined,
          lastMessage: last?.message || last?.text || item?.message || '',
          timeRaw: last?.created_at || item?.created_at || item?.updated_at || '',
          unread: item?.unread_count ?? item?.unread ?? 0,
          online: user?.is_online || false,
          seen: last?.is_sent_by_me ?? item?.is_sent_by_me ?? false,
          type: user?.user_type || user?.type || 'staff',
        };
      });

      setAllChats(formatted);
      // default to showing all conversations
      setChats(formatted);
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userType) fetchAllChats();
  }, [userType]);

  // Refresh when screen comes into focus so updates (sent messages) appear immediately
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchAllChats();
    });
    return unsub;
  }, [navigation, userType]);

  // update tick every 30s to refresh runtime labels
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Periodically refresh conversations every 20 seconds while the screen is active
  useEffect(() => {
    if (!userType) return; // wait until userType (and currentUserId) are loaded
    const id = setInterval(() => {
      try {
        fetchAllChats();
      } catch (e) {
        console.error('Periodic fetchAllChats error:', e);
      }
    }, 30000);

    return () => clearInterval(id);
  }, [userType]);



  useEffect(() => {
    if (activeFilter) {
      console.log('Filtering for:', activeFilter);
      console.log('All chats:', allChats);

      setChats(allChats); // 👈 TEMP remove filter
    }
  }, [activeFilter, allChats]);

  // ✅ Called when user taps "Access Now"
  const handleSelectRole = (type: 'staff' | 'customer' | 'contractor') => {
    setActiveFilter(type);
    // If staff selected, open staff sheet via FAB instead of inline dropdown
    if (type === 'staff') {
      // do not auto-open; show FAB for user to tap
    }
  };

  // Fetch staff with params
  const fetchStaffWithLimit = async (limit = 500) => {
    setStaffLoading(true);
    try {
      const res = await getStaff({ limit });
      // response shape may be { data: { data: [...] } } or similar; handle common cases
      const items = res?.data?.data || res?.data || res?.data?.staff || [];
      // Normalize to array
      const normalized = Array.isArray(items) ? items : [];
      setStaffList(normalized);
    } catch (err) {
      console.error('Failed to fetch staff with limit:', err);
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  // Generic fetch for active filter (staff | customer | contractor)
  const fetchListForActiveFilter = async (limit = 500) => {
    setStaffLoading(true);
    try {
      let res: any = null;
      if (activeFilter === 'staff') {
        res = await getStaff({ limit });
      } else if (activeFilter === 'customer') {
        res = await getCustomers({ limit });
      } else if (activeFilter === 'contractor') {
        // call admin contractors endpoint (supports params after our recent change)
        res = await getContractor({ limit });
      }

      const items = res?.data?.data || res?.data || res?.data?.staff || res?.data?.customers || res?.data?.contractors || [];
      const normalized = Array.isArray(items) ? items : [];
      setStaffList(normalized);
    } catch (err) {
      console.error('Failed to fetch list for', activeFilter, err);
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  // ✅ Back from chat list → return to card picker
  const handleBackToCards = () => {
    setActiveFilter(null);
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.4}
      pressBehavior="close"
    />
  );

  const filterLabel =
    activeFilter
      ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)
      : '';

  // ─── Loading state ───────────────────────────────────────────────────────
  // if (loading) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <Text style={{ textAlign: 'center', marginTop: 100 }}>
  //         Loading conversations...
  //       </Text>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBox}
          onPress={
            // If viewing chat list → go back to cards; otherwise go back in nav
            activeFilter ? handleBackToCards : () => navigation.goBack()
          }
        >
          <ChevronLeft size={26} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {activeFilter ? `${filterLabel} Chats` : 'Messages'}
        </Text>


      </View>


      {/* ─── Main Content ────────────────────────────────────────────────── */}
      {activeFilter === null ? (
        /* ── Show role selection cards ── */
        <RoleSelectionView onSelect={handleSelectRole} userType={userType} />
      ) : (
        /* ── Show filtered chat list ── */
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                try {
                  setRefreshing(true);
                  await fetchAllChats();
                } catch (e) {
                  /* ignore */
                } finally {
                  setRefreshing(false);
                }
              }}
            />
          }
        >
          <View style={styles.chatList}>
            {chats.length === 0 ? (
              <Text
                style={{ textAlign: 'center', marginTop: 80, color: '#6B7280' }}
              >
                No {filterLabel.toLowerCase()} conversations found
              </Text>
            ) : (
              chats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  style={styles.chatItem}
                  activeOpacity={0.75}
                  onPress={async () => {
                    try {
                      // mark messages read for this chat
                      await readAllMessages(chat.id);

                      // fetch conversation for this chat
                      const conversation = await getConversation(chat.id);

                      // best-effort refresh of conversations
                      try { await getConversations(); } catch (e) { /* ignore */ }

                      navigation.navigate('MessageDetail', {
                        chatId: chat.id,
                        name: chat.name,
                        conversation,
                      });
                    } catch (err) {
                      console.error('Chat press error:', err);
                      // fallback to navigate anyway
                      navigation.navigate('MessageDetail', {
                        chatId: chat.id,
                        name: chat.name,
                      });
                    }
                  }}
                >
                  <View style={styles.avatarContainer}>
                    {chat.avatar ? (
                      <Image source={chat.avatar} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarInitial}>
                        <Text style={styles.avatarInitialText}>{(() => {
                          const parts = (chat.name || '').trim().split(/\s+/);
                          const a = parts[0]?.charAt(0) || '';
                          const b = parts[parts.length - 1]?.charAt(0) || '';
                          return (a + b).toUpperCase();
                        })()}</Text>
                      </View>
                    )}
                    {chat.online && <View style={styles.onlineDot} />}
                  </View>

                  <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{chat.name}</Text>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                  </View>

                  <View style={styles.rightColumn}>
                    <Text style={styles.timeText}>{formatMessageRuntime(chat.timeRaw)}</Text>
                    {chat.unread && chat.unread > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>{chat.unread}</Text>
                      </View>
                    ) : chat.seen ? (
                      <CheckCheck size={16} color="#6366F1" strokeWidth={2.5} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <BottomTab navigation={navigation} activeTab="Messages" />

      {/* FAB for listing (visible when a role filter is active) */}
      {activeFilter && (
        <TouchableOpacity
          style={styles.fab}
          onPress={async () => {
            await fetchListForActiveFilter(500);
            staffSheetRef.current?.expand();
          }}
        >
          <Plus size={28} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      )}

      {/* FIXED SCROLLING - Staff / User Selection BottomSheet */}
      <BottomSheet
        ref={staffSheetRef}
        index={-1}
        snapPoints={staffSnap}           // ['65%', '70%'] — you can increase to ['60%', '85%'] if needed
        enablePanDownToClose={true}
        enableContentPanningGesture={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {/* Remove BottomSheetView for better scrolling in many cases */}
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            Select {filterLabel || 'User'}
          </Text>
          <TouchableOpacity onPress={closeStaffSheet} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${filterLabel?.toLowerCase() || 'users'}...`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {staffLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.dropdownLoading}>
              Loading {filterLabel?.toLowerCase()}...
            </Text>
          </View>
        ) : staffList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {filterLabel?.toLowerCase()} found
            </Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={filteredList as StaffUser[]}
            keyExtractor={(item: StaffUser, index: number) => `user-${item.id || index}`}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.listContentContainer}   // ← Very important
            style={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Not exist</Text>
              </View>
            }
            renderItem={({ item }: { item: StaffUser }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={async () => {
                  try {
                    await readAllMessages(item.id);
                    const conversation = await getConversation(item.id);
                    try { await getConversations(); } catch (e) { }

                    closeStaffSheet();
                    navigation.navigate('MessageDetail', {
                      chatId: item.id,
                      name: item.name || item.full_name || 'User',
                      conversation,
                    });
                  } catch (err) {
                    console.error('User select error:', err);
                  }
                }}
              >
                <View style={styles.staffRow}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.staffAvatarText}>
                      {(() => {
                        const name = (item.name || item.full_name || '').trim();
                        const parts = name.split(/\s+/);
                        return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
                      })()}
                    </Text>
                  </View>

                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.dropdownItemText}>
                      {item.name || item.full_name || 'Unnamed'}
                    </Text>
                    <Text style={styles.dropdownSubText}>
                      {item.email || item.user_email || ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </BottomSheet>

      {/* ─── Attachments Bottom Sheet ────────────────────────────────────── */}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photosContainer}
          >
            <Image
              source={require('../assets/blog1.jpg')}
              style={styles.photoThumb}
            />
            <Image
              source={require('../assets/blog2.jpg')}
              style={styles.photoThumb}
            />
            <Image
              source={require('../assets/blog3.jpg')}
              style={styles.photoThumb}
            />
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
            OTHER FILES
          </Text>
          <View style={styles.filesList}>
            {[
              {
                bg: '#DBEAFE',
                icon: '↓',
                name: 'Project Brief v1.docx',
                size: '132.5 KB',
              },
              {
                bg: '#E0F2FE',
                icon: '📊',
                name: '32 Excel Sheets',
                size: '12.5 MB',
              },
              {
                bg: '#F3E8FF',
                icon: '📄',
                name: '60 PDF presentations',
                size: '28.5 MB',
              },
              {
                bg: '#FEF3C7',
                icon: '🎥',
                name: 'Explanation Video.mp4',
                size: '80 MB',
              },
            ].map((f) => (
              <View key={f.name} style={styles.fileItem}>
                <View
                  style={[
                    styles.fileIconContainer,
                    { backgroundColor: f.bg },
                  ]}
                >
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

// ─── Role Card Styles ──────────────────────────────────────────────────────────
const roleStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 14,
  },
  heading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    // marginBottom: 2,
  },
  subheading: {
    fontSize: 12,
    color: '#6B7280',
    // marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,

    elevation: 10,
  },
  cardTop: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    fontSize: 25,
  },
  cardLabel: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cardBottom: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 10,
  },
  accessBtn: {
    backgroundColor: '#2EB1E2',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  accessBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Main Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 50
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    minWidth: 64, // keeps header layout stable when icons hide
  },
  scrollView: {
    flex: 1,
  },
  chatList: {
    paddingTop: 25,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarInitial: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2EB1E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialText: {
    color: '#111827',
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 3,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  rightColumn: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  unreadBadge: {
    backgroundColor: '#2EB1E2',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 48,
    height: 5,
    borderRadius: 3,
  },


  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#374151',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  photosContainer: {
    marginBottom: 0,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 16,
  },
  filesList: {
    gap: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIcon: {
    fontSize: 24,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  fileSize: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    // borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
    maxHeight: 300,
    zIndex: 40,
  },
  dropdownLoading: {
    padding: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  dropdownList: {
    // maxHeight: 220,
  },

  dropdownItemText: {
    fontSize: 15,
    color: '#111827',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 84,
    width: 45,
    height: 45,
    borderRadius: 30,
    backgroundColor: '#2EB1E2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },

  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarText: {
    color: '#111827',
    fontWeight: '700',
  },
  dropdownSubText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },


  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },




  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },

  // Inside your StyleSheet.create
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  searchPlaceholder: {
    color: '#6B7280',
    fontSize: 15,
    marginLeft: 8,
  },

  listContainer: {
    flex: 1,                    // crucial
  },

  listContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,         // ← Increase this if you still can't see the last items
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },

  emptyText: {
    color: '#6B7280',
    fontSize: 16,
  },

  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
