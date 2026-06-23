import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ReactNativeBlobUtil from "react-native-blob-util";
import LinearGradient from "react-native-linear-gradient";
import { getAuthToken } from "../services/authApi";
import PdfViewerModal from "./PdfViewerModal";
import FileViewer from "react-native-file-viewer";
import {
  ArrowLeft,
  Eye,
  Share2,
  History,
  X,
  Plus,
  Send,
  Mail,
  Download,
} from "lucide-react-native";

const COLORS = {
  primary: "#4FCBB3",
  primaryLight: "#89E7D0",
  background: "#0A0F1E",
  surface: "#111827",
  surface2: "#1A2438",
  card: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.09)",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.65)",
  textMuted: "rgba(255,255,255,0.38)",
  success: "#22C55E",
  successBg: "rgba(34,197,94,0.12)",
  warning: "#F59E0B",
  warningBg: "rgba(245,158,11,0.12)",
  danger: "#EF4444",
  dangerBg: "rgba(239,68,68,0.12)",
  border: "rgba(255,255,255,0.08)",
  modalBg: "#0E1525",
  downloadBg: "rgba(96,165,250,0.14)",
  downloadColor: "#60A5FA",
};

interface Transaction {
  id: number;
  amount: string;
  service_fee: string;
  total_amount: string;
  amount_charged?: string;
  status: string;
  created_at: string;
  currency: string;
  job_roster_id: string | null;
  payment_intent_id?: string;
  invoice_filename?: string;
}

interface ShareHistoryItem {
  email: string;
  created_at: string;
  status: string;
  message?: string;
}

interface ShareRecord {
  email: string;
  created_at: string;
  status: string;
  message?: string;
  file_name?: string;
}

interface ShareHistoryData {
  total_shares: number;
  successful: number;
  recipients: number;
  shares: ShareHistoryItem[];
}

type Props = {
  navigation: any;
  route: any;
};

const formatDateTime = (dateString: string) => {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} · ${hours}:${minutes}`;
};

const formatHistoryDate = (dateString: string) => {
  const d = new Date(dateString);
  const day = d.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} · ${hours}:${minutes}`;
};

const getStatusMeta = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
    case "succeeded":
    case "captured":
      return { color: COLORS.success, bg: COLORS.successBg, label: "Paid" };
    case "held":
    case "requires_capture":
      return { color: COLORS.warning, bg: COLORS.warningBg, label: "Held" };
    case "processing":
      return {
        color: COLORS.warning,
        bg: COLORS.warningBg,
        label: "Processing",
      };
    case "failed":
    case "canceled":
      return { color: COLORS.danger, bg: COLORS.dangerBg, label: "Failed" };
    default:
      return {
        color: COLORS.textSecondary,
        bg: "rgba(255,255,255,0.08)",
        label: status,
      };
  }
};

const BASE_URL = "https://apis.staffoo.com.au";

export default function JobPaymentHistory({ navigation }: Props) {
  const [userId, setUserId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyData, setHistoryData] = useState<ShareHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTransaction, setHistoryTransaction] =
    useState<Transaction | null>(null);

  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const storedId = await AsyncStorage.getItem("@user_id");
      if (storedId) {
        const parsedId = parseInt(storedId, 10);
        setUserId(parsedId);
        fetchTransactions(parsedId);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const fetchTransactions = async (id: number) => {
    try {
      setLoading(true);
      const { getUserTransactions } = require("../services/authApi");
      const res = await getUserTransactions(id);
      setTransactions(res?.data || []);
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error.message || error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    try {
      setRefreshing(true);
      const { getUserTransactions } = require("../services/authApi");
      const res = await getUserTransactions(userId);
      setTransactions(res?.data || []);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  // ── View PDF (cache dir, opens in-app viewer) ────────────────────────────────
  const handleViewInvoice = (item: Transaction) => {
    if (!item.invoice_filename) {
      Alert.alert("No Invoice", "Invoice not available for this transaction.");
      return;
    }
    const pdfUrl = `${BASE_URL}/storage/invoices/${item.invoice_filename}`;
    (async () => {
      try {
        const filename = item.invoice_filename || `invoice_${item.id}.pdf`;
        const cachePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;
        const tmpPath = cachePath + ".tmp";
        try {
          if (await ReactNativeBlobUtil.fs.exists(tmpPath))
            await ReactNativeBlobUtil.fs.unlink(tmpPath);
          if (await ReactNativeBlobUtil.fs.exists(cachePath))
            await ReactNativeBlobUtil.fs.unlink(cachePath);
        } catch (e) {}
        await ReactNativeBlobUtil.config({
          path: tmpPath,
          trusty: false,
        }).fetch("GET", pdfUrl);
        try {
          await ReactNativeBlobUtil.fs.mv(tmpPath, cachePath);
        } catch (mvErr) {}
        const finalExists = await ReactNativeBlobUtil.fs.exists(cachePath);
        setPdfUri(finalExists ? `file://${cachePath}` : pdfUrl);
        setPdfModalVisible(true);
      } catch (err) {
        setPdfUri(pdfUrl);
        setPdfModalVisible(true);
      }
    })();
  };

  // ── Download PDF to Downloads / Documents folder ─────────────────────────────
  const handleDownloadInvoice = async (item: Transaction) => {
    if (!item.invoice_filename) {
      Alert.alert("No Invoice", "Invoice not available for this transaction.");
      return;
    }
    if (downloadingId === item.id) return;

    const pdfUrl = `${BASE_URL}/storage/invoices/${item.invoice_filename}`;
    const filename = item.invoice_filename;
    const destDir =
      Platform.OS === "android"
        ? ReactNativeBlobUtil.fs.dirs.DownloadDir
        : ReactNativeBlobUtil.fs.dirs.DocumentDir;
    const destPath = `${destDir}/${filename}`;
    const tmpPath = `${destPath}.tmp`;

    try {
      setDownloadingId(item.id);

      try {
        if (await ReactNativeBlobUtil.fs.exists(tmpPath))
          await ReactNativeBlobUtil.fs.unlink(tmpPath);
        if (await ReactNativeBlobUtil.fs.exists(destPath))
          await ReactNativeBlobUtil.fs.unlink(destPath);
      } catch (e) {}

      if (Platform.OS === "android") {
        // Use Android DownloadManager — shows system notification, adds to Downloads app
        await ReactNativeBlobUtil.config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: filename,
            description: "Downloading invoice…",
            mime: "application/pdf",
            mediaScannable: true,
            path: destPath,
          },
        }).fetch("GET", pdfUrl);
      } else {
        // iOS: save to Documents dir (visible in Files app under the app name)
        await ReactNativeBlobUtil.config({
          path: tmpPath,
          trusty: false,
        }).fetch("GET", pdfUrl);
        try {
          await ReactNativeBlobUtil.fs.mv(tmpPath, destPath);
        } catch (e) {}
      }

      const finalExists = await ReactNativeBlobUtil.fs.exists(destPath);
      const fileUri = finalExists ? destPath : tmpPath;

      Alert.alert(
        "✅ Saved",
        Platform.OS === "android"
          ? `Invoice saved to your Downloads folder.\n${filename}`
          : `Invoice saved to Files app (On My iPhone).\n${filename}`,
        [
          {
            text: "Open",
            onPress: () =>
              FileViewer.open(
                fileUri.startsWith("file://") ? fileUri : `file://${fileUri}`,
                { showOpenWithDialog: true },
              ).catch(() =>
                Alert.alert(
                  "Cannot Open",
                  "No PDF viewer found on your device.",
                ),
              ),
          },
          { text: "OK", style: "cancel" },
        ],
      );
    } catch (err) {
      console.warn("Download failed:", err);
      Alert.alert(
        "Download Failed",
        "Could not save the file. Check your connection and try again.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────────
  const handleOpenShare = (item: Transaction) => {
    setSelectedTransaction(item);
    setEmailInput("");
    setEmailList([]);
    setShareModalVisible(true);
  };

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (emailList.includes(trimmed)) {
      Alert.alert("Duplicate", "This email is already added.");
      return;
    }
    setEmailList((prev) => [...prev, trimmed]);
    setEmailInput("");
  };

  const handleRemoveEmail = (email: string) =>
    setEmailList((prev) => prev.filter((e) => e !== email));

  const handleSendDocument = async () => {
    if (emailList.length === 0) {
      Alert.alert("No Recipients", "Please add at least one email address.");
      return;
    }
    if (!selectedTransaction) return;
    try {
      setSharing(true);
      const token = await getAuthToken();
      const response = await fetch(`${BASE_URL}/api/share-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emails: emailList,
          transaction_id: selectedTransaction.id,
          invoice_filename: selectedTransaction.invoice_filename,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Invoice sent successfully!");
        setShareModalVisible(false);
      } else {
        Alert.alert("Error", data?.message || "Failed to send invoice.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  // ── History ───────────────────────────────────────────────────────────────────
  const handleOpenHistory = async (item: Transaction) => {
    setHistoryTransaction(item);
    setHistoryModalVisible(true);
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${BASE_URL}/api/admin/invoice/history/${item.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      const data = await response.json();
      if (Array.isArray(data?.data)) {
        const shares: ShareRecord[] = data.data.map((s: any) => ({
          email: s.email,
          created_at: s.created_at,
          status: s.status || s.state || "sent",
          message: s.response || s.message || "",
          file_name: s.file_name || s.invoice_filename || "",
        }));
        setHistoryData({
          total_shares: shares.length,
          successful: shares.filter((s) => s.status === "sent").length,
          recipients: new Set(shares.map((s) => s.email)).size,
          shares: shares as any,
        });
      } else if (data?.data?.shares) {
        const raw = data.data;
        setHistoryData({
          total_shares: raw.total_shares ?? raw.shares.length,
          successful:
            raw.successful ??
            raw.shares.filter((s: any) => s.status === "sent").length,
          recipients:
            raw.recipients ??
            [...new Set(raw.shares.map((s: any) => s.email))].length,
          shares: raw.shares || [],
        });
      } else {
        setHistoryData({
          total_shares: 0,
          successful: 0,
          recipients: 0,
          shares: [],
        });
      }
    } catch {
      Alert.alert("Error", "Failed to load share history.");
      setHistoryModalVisible(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Render Card ───────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Transaction }) => {
    const statusMeta = getStatusMeta(item.status);
    const shortId = item.payment_intent_id;
    // ? item.payment_intent_id.slice(-8).toUpperCase()
    // : `#${item.id}`;
    const isDownloading = downloadingId === item.id;

    return (
      <View style={styles.card}>
        {/* Amount + Status */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardAmount}>
              ${parseFloat(item.total_amount || "0").toFixed(2)}
              <Text style={styles.cardCurrency}> {item.currency}</Text>
            </Text>
            {/* <Text style={styles.cardSubAmount}>
              Base: ${parseFloat(item.amount || "0").toFixed(2)}
            </Text> */}
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}
          >
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Transaction ID</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {shortId}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {formatDateTime(item.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleViewInvoice(item)}
            activeOpacity={0.75}
          >
            <Eye size={14} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDownload]}
            onPress={() => handleDownloadInvoice(item)}
            disabled={isDownloading}
            activeOpacity={0.75}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={COLORS.downloadColor} />
            ) : (
              <>
                <Download size={14} color={COLORS.downloadColor} />
                <Text style={styles.actionBtnDownloadText}>Save</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleOpenShare(item)}
            activeOpacity={0.75}
          >
            <Share2 size={14} color={COLORS.primary} />
            <Text style={styles.actionBtnOutlineText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnGhost]}
            onPress={() => handleOpenHistory(item)}
            activeOpacity={0.75}
          >
            <History size={14} color={COLORS.textSecondary} />
            <Text style={styles.actionBtnGhostText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.emptyText, { marginTop: 16 }]}>
          Loading transactions…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Payment History</Text>
          {/* {transactions.length > 0 && (
            <Text style={styles.headerSub}>
              {transactions.length} transactions
            </Text>
          )} */}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyText}>
              Your payment history will appear here.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Share2 size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Share Document</Text>
                {selectedTransaction?.invoice_filename && (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {selectedTransaction.invoice_filename}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShareModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Enter email addresses to send the invoice to.
            </Text>

            <View style={styles.emailInputRow}>
              <TextInput
                style={styles.emailInput}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="e.g. user@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={handleAddEmail}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addEmailBtn}
                onPress={handleAddEmail}
              >
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {emailList.length > 0 && (
              <View style={styles.tagContainer}>
                {emailList.map((email) => (
                  <View key={email} style={styles.emailTag}>
                    <Text style={styles.emailTagText} numberOfLines={1}>
                      {email}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveEmail(email)}
                      style={styles.tagRemove}
                    >
                      <X size={12} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShareModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sharing && styles.sendBtnDisabled]}
                onPress={handleSendDocument}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={15} color="#fff" />
                    <Text style={styles.sendBtnText}>Send Document</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={historyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconWrap,
                  { backgroundColor: "rgba(79,203,179,0.12)" },
                ]}
              >
                <History size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Share History</Text>
                {historyTransaction?.payment_intent_id && (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {historyTransaction.payment_intent_id}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <View style={{ paddingVertical: 48, alignItems: "center" }}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : historyData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: COLORS.primary }]}>
                      {historyData.total_shares}
                    </Text>
                    <Text style={styles.statLabel}>Total Shares</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: COLORS.success }]}>
                      {historyData.successful}
                    </Text>
                    <Text style={styles.statLabel}>Successful</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: "#60A5FA" }]}>
                      {historyData.recipients}
                    </Text>
                    <Text style={styles.statLabel}>Recipients</Text>
                  </View>
                </View>

                {historyData.shares.length === 0 ? (
                  <Text
                    style={[
                      styles.emptyText,
                      { textAlign: "center", paddingVertical: 32 },
                    ]}
                  >
                    No share history found.
                  </Text>
                ) : (
                  historyData.shares.map((share, idx) => (
                    <View key={idx} style={styles.historyItem}>
                      <View style={styles.historyIconWrap}>
                        <Mail size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.historyItemTop}>
                          <Text style={styles.historyEmail} numberOfLines={1}>
                            {share.email}
                          </Text>
                          <View
                            style={[
                              styles.historyStatusBadge,
                              {
                                backgroundColor:
                                  share.status === "sent"
                                    ? COLORS.successBg
                                    : COLORS.dangerBg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.historyStatusText,
                                {
                                  color:
                                    share.status === "sent"
                                      ? COLORS.success
                                      : COLORS.danger,
                                },
                              ]}
                            >
                              {share.status === "sent" ? "Sent" : share.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.historyDate}>
                          {formatHistoryDate(share.created_at)}
                        </Text>
                        {share.message && (
                          <View style={styles.historyMessageRow}>
                            <View style={styles.historyMessageBar} />
                            <Text style={styles.historyMessage}>
                              {share.message}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {pdfUri && (
        <PdfViewerModal
          visible={pdfModalVisible}
          uri={pdfUri}
          onClose={() => {
            setPdfModalVisible(false);
            setPdfUri(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "ios" ? 54 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primaryLight,
    letterSpacing: 0.2,
  },
  cardCurrency: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  cardSubAmount: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 7,
    gap: 10,
  },
  detailItem: { flex: 1 },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  detailValue: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },
  detailDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 5,
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 19,
  },
  actionBtnPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  actionBtnDownload: {
    backgroundColor: COLORS.downloadBg,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  actionBtnDownloadText: {
    color: COLORS.downloadColor,
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtnOutline: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  actionBtnOutlineText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtnGhost: {
    backgroundColor: "transparent",
    borderBottomRightRadius: 19,
  },
  actionBtnGhostText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(79,203,179,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  emailInputRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  emailInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addEmailBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  emailTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    maxWidth: "90%",
  },
  emailTagText: { fontSize: 13, color: COLORS.textSecondary, flexShrink: 1 },
  tagRemove: { padding: 2 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  sendBtn: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: { fontSize: 24, fontWeight: "800" },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  historyItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  historyEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  historyStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  historyStatusText: { fontSize: 11, fontWeight: "700" },
  historyDate: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  historyMessageRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  historyMessageBar: {
    width: 2,
    height: "100%",
    borderRadius: 1,
    backgroundColor: COLORS.primary,
    minHeight: 16,
  },
  historyMessage: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
});
