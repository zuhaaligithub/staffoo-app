
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import {
  ChevronLeft,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../services/authApi";
import { normalizeBankDetails } from "../utils/paymentCards";
import LinearGradient from "react-native-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  background: "#030508",
  surface: "#0A121C",
  card: "#0F1A28",
  cardBorder: "rgba(255,255,255,0.08)",
  primary: "#00A99D",
  primarySoft: "rgba(0,169,157,0.15)",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.65)",
  textMuted: "rgba(255,255,255,0.4)",
  danger: "#EF4444",
  dangerSoft: "rgba(239,68,68,0.15)",
  warning: "#F5A623",
  chip: "#D4AF37",
};

type Card = {
  card_holder_name: string;
  card_number: string;
  expiry_month: string;
  expiry_year: string;
};

type Props = {
  navigation: any;
};

export default function PaymentMethodsScreen({ navigation }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom modals
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const openDeleteModal = (index: number) => {
    setDeleteIndex(index);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalVisible(false);
    setDeleteIndex(null);
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) return;

    try {
      setDeleting(true);

      const updatedCards = cards.filter((_, i) => i !== deleteIndex);

      const token = await AsyncStorage.getItem("@auth_token");
      const userStr = await AsyncStorage.getItem("user");
      if (!token || !userStr) {
        throw new Error("Missing auth or user session");
      }

      const user = JSON.parse(userStr);

      const formData = new FormData();
      formData.append("bank_details", JSON.stringify(updatedCards));

      const res = await axios.post(
        `${BASE_URL}/user-update/${user.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data && res.data.success) {
        setCards(updatedCards);
        setDeleteModalVisible(false);
        setDeleteIndex(null);
        setSuccessModalVisible(true);
      } else {
        throw new Error("Failed to update server");
      }
    } catch (error) {
      console.error("Delete card error:", error);
      // You can add an error modal here later if needed
    } finally {
      setDeleting(false);
    }
  };

  const fetchCards = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("@auth_token");
      if (!token) throw new Error("No auth token");

      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) throw new Error("User session not found");

      const user = JSON.parse(userStr);
      const res = await axios.get(`${BASE_URL}/user-edit/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data?.success || !res.data?.data?.customer?.bank_details) {
        setCards([]);
        return;
      }

      const raw = res.data.data.customer.bank_details;
      setCards(normalizeBankDetails(raw));
    } catch (err) {
      console.error("Load cards error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCards();
    }, []),
  );

  const handleAddNew = () => {
    navigation.navigate("PaymentHistory", {
      onCardAdded: fetchCards,
    });
  };

  const renderCard = ({ item, index }: { item: Card; index: number }) => {
    const last4 = item.card_number.replace(/\D/g, "").slice(-4);

    return (
      // <View style={styles.creditCard}>
       <LinearGradient
                     colors={["#0B1F3A", "#173F73", "#2457A7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.creditCard}
                >
        {/* Header actions */}
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("PaymentHistory", {
                editIndex: index,
                card: item,
                onCardAdded: fetchCards,
              })
            }
            activeOpacity={0.8}
          >
            <Pencil size={14} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => openDeleteModal(index)}
            activeOpacity={0.8}
          >
            <Trash2 size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Chip + Brand */}
        <View style={styles.cardTop}>
          <View style={styles.chipContainer}>
            <View style={styles.chip}>
              <View style={styles.chipInner} />
              <View style={styles.chipShine} />
            </View>
          </View>
          <Text style={styles.cardBrand}>VISA</Text>
        </View>

        {/* Number */}
        <Text style={styles.cardNumberLarge}>•••• •••• •••• {last4}</Text>

        {/* Bottom */}
        <View style={styles.cardBottom}>
          <View style={styles.cardHolderContainer}>
            <Text style={styles.cardLabel}>Card Holder</Text>
            <Text
              style={styles.cardValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.card_holder_name.toUpperCase()}
            </Text>
          </View>

          <View style={styles.expiryContainer}>
            <Text style={styles.cardLabel}>Expires</Text>
            <Text style={styles.cardValue}>
              {item.expiry_month.padStart(2, "0")}/{item.expiry_year.slice(-2)}
            </Text>
          </View>
        </View>
     </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {!loading && cards.length > 0 && (
        <Text style={styles.subtitle}>Your saved cards</Text>
      )}

      {/* Cards list */}
      <View style={styles.cardsWrapper}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ flex: 1 }}
          />
        ) : cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptyText}>
              Add a payment method to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={(_, index) => `card-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Add New Card */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddNew}
        activeOpacity={0.85}
      >
        <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.addButtonText}>Add New Card</Text>
      </TouchableOpacity>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <View
                style={[
                  styles.modalIconCircle,
                  { backgroundColor: COLORS.dangerSoft },
                ]}
              >
                <AlertTriangle size={28} color={COLORS.danger} />
              </View>
            </View>

            <Text style={styles.modalTitle}>Delete this card?</Text>
            <Text style={styles.modalSubtitle}>
              This action cannot be undone. The card will be permanently removed
              from your account.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeDeleteModal}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDeleteBtn, deleting && { opacity: 0.7 }]}
                onPress={confirmDelete}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <View
                style={[
                  styles.modalIconCircle,
                  { backgroundColor: COLORS.primarySoft },
                ]}
              >
                <CheckCircle size={28} color={COLORS.primary} />
              </View>
            </View>

            <Text style={styles.modalTitle}>Card deleted</Text>
            <Text style={styles.modalSubtitle}>
              The payment method has been removed successfully.
            </Text>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setSuccessModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },

  cardsWrapper: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
    maxHeight: SCREEN_HEIGHT * 0.68,
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  /* Card */
  creditCard: {
    backgroundColor: "#rgb(30, 60, 114)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 9,
    minHeight: 100,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
   
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  deleteButton: {
    width: 30,
    height: 30,
    backgroundColor: "#EF4444",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
chipContainer: { width: 45, height: 30 },
  chip: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.chip,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f6d365",
  },
  chipInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  chipShine: {
    position: "absolute",
    top: 5,
    left: 7,
    width: 28,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
  },
  cardBrand: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  cardNumberLarge: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 2.5,
    marginTop: 14,
    marginBottom: 5,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  cardHolderContainer: {
    flex: 1,
    marginRight: 16,
  },
  expiryContainer: {
    alignItems: "flex-end",
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  /* Add button */
  addButton: {
    position: "absolute",
    bottom: 28,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3,5,8,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
  },
  modalIconWrap: {
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalDoneBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  modalDoneText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
