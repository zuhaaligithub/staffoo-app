import React, { useState, useEffect } from "react";
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
  Platform,
  Modal,
} from "react-native";
import { ChevronLeft, Plus, Search } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import LinearGradient from "react-native-linear-gradient";

import { BASE_URL, getConversations } from "../services/authApi";

const COLORS = {
  primary: "#89E7D0",
  primaryDark: "#4FCBB3",
  background: "#001F3F",
  surface: "#20b72c",
  surface2: "#12243A",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.5)",
  success: "#22C55E",
  danger: "#EF4444",
  border: "rgba(255,255,255,0.08)",
};

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
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const hour = d.getHours();
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = ((hour + 11) % 12) + 1;

  if (isToday) return `${hour12}:${minute} ${ampm}`;
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString();
};

export default function MessageScreen({ navigation }: Props) {
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
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

          const isAdmin =
            user?.user_type === "admin" ||
            user?.email?.toLowerCase().includes("admin") ||
            user?.name?.toLowerCase().includes("admin") ||
            item?.is_admin === true;

          if (!isAdmin) return null;

          return {
            id: user?.id ?? item?.id,
            name: user?.name || user?.full_name || "Admin",
            avatar: user?.avatar ? { uri: user.avatar } : undefined,
            lastMessage: getMessageText(item) || "No messages yet",
            timeRaw: getMessageTimestamp(item),
            unread: getChatUnreadCount(item),
            online: user?.is_online || false,
            seen: getLatestMessageItem(item)?.is_sent_by_me ?? false,
          };
        })
        .filter(Boolean);

      setChats(formatted);
    } catch (err: any) {
      console.error("Failed to fetch conversations:", err);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFabPress = async () => {
    try {
      setAdminLoading(true);

      const token = await AsyncStorage.getItem("@auth_token");

      const response = await fetch(`${BASE_URL}/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const json = await response.json();

      if (json.success) {
        setAdmins(json.data || []);
        setShowAdminModal(true);
      } else {
        Toast.show({
          type: "error",
          text1: "Unable to load admins",
        });
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Something went wrong",
      });
    } finally {
      setAdminLoading(false);
    }
  };

  const getLatestMessageItem = (item: any) => {
    if (!item) return null;
    if (item.last_message) return item.last_message;
    if (item.message) return item.message;
    return item;
  };

  const getMessageText = (item: any) => {
    const last = getLatestMessageItem(item);
    if (!last) return "";
    return last.message || last.text || last.body || "";
  };

  const getMessageTimestamp = (item: any) => {
    const last = getLatestMessageItem(item);
    return last?.created_at || item?.created_at || "";
  };

  const getChatUnreadCount = (item: any) =>
    item?.unread_count || item?.unread || 0;

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", fetchChats);
    return unsub;
  }, [navigation]);

  const filteredChats = chats.filter((chat) =>
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
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

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
            <Text style={styles.loadingText}>Loading Conversations...</Text>
          </View>
        ) : filteredChats.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "No matching conversations found"
                : "No conversations yet"}
            </Text>
          </View>
        ) : (
          filteredChats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              onPress={() => {
                navigation.navigate("MessageDetail", {
                  chatId: chat.id,
                  name: chat.name,
                });
              }}
            >
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.42)",
                  "rgba(255, 255, 255, 0.12)",
                ]}
                style={styles.chatItem}
              >
                <View style={styles.chatItems}>
                  <View style={styles.avatarContainer}>
                    {chat.avatar ? (
                      <Image source={chat.avatar} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarInitial}>
                        <Text style={styles.avatarInitialText}>
                          {chat.name?.charAt(0)?.toUpperCase() || "A"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.chatInfo}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.chatName}>{chat.name}</Text>
                      <Text
                        style={{
                          color: "#0A7C6E",
                          fontSize: 13,
                          marginLeft: 4,
                        }}
                      >
                        (Admin)
                      </Text>
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {chat.lastMessage || "No messages yet"}
                    </Text>
                  </View>

                  <View style={styles.rightColumn}>
                    <Text style={styles.timeText}>
                      {formatMessageRuntime(chat.timeRaw)}
                    </Text>
                    {Number(chat.unread) > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCount}>
                          {String(chat.unread)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleFabPress}
        disabled={adminLoading}
      >
        {adminLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Plus size={28} color="#fff" />
        )}
      </TouchableOpacity>
      <Modal
        visible={showAdminModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdminModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowAdminModal(false)}
        >
          <View style={styles.adminPopup}>
            <Text style={styles.popupTitle}>Start Conversation</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {admins.map((admin) => (
                <TouchableOpacity
                  key={admin.id}
                  style={styles.adminItem}
                  onPress={() => {
                    setShowAdminModal(false);

                    navigation.navigate("MessageDetail", {
                      chatId: admin.id,
                      name: admin.name,
                    });
                  }}
                >
                  <View style={styles.avatarInitial}>
                    <Text style={styles.avatarInitialText}>
                      {admin.name.charAt(0)}
                    </Text>
                  </View>

                  <Text style={styles.adminName}>{admin.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030508",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 10,
  },
  scrollView: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary },
  emptyText: { color: COLORS.textSecondary, fontSize: 16 },
  chatItems: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: "100%",
  },
  chatItem: {
    marginHorizontal: 16,
    marginBottom: 15,
    borderRadius: 20,
    overflow: "hidden",
  },
  avatarContainer: { position: "relative" },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarInitial: {
    width: 34,
    height: 34,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitialText: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  chatInfo: { flex: 1, marginLeft: 14 },
  chatName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  lastMessage: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  rightColumn: { alignItems: "flex-end", minWidth: 70 },
  timeText: { fontSize: 12, color: COLORS.textMuted },
  unreadBadge: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginTop: 4,
  },
  unreadCount: { color: COLORS.text, fontSize: 12, fontWeight: "600" },

  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#0A7C6E",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  adminPopup: {
    position: "absolute",
    right: 0,
    bottom: 80,

    width: 220,

    maxHeight: 400,

    backgroundColor: "#12243A",

    borderRadius: 16,

    padding: 15,

    elevation: 8,
  },

  popupTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  adminItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  adminName: {
    color: "#fff",
    fontSize: 15,
    marginLeft: 12,
  },
});
