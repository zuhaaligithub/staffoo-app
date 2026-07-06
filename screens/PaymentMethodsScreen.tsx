import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../services/authApi";
import { normalizeBankDetails } from "../utils/paymentCards";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  primary: "#89E7D0",
  background: "#111111",
  surface: "#12243A",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.7)",
  border: "rgba(255,255,255,0.08)",
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

  const handleDeleteCard = (index: number) => {
    Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            const updatedCards = cards.filter((_, i) => i !== index);

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
              Alert.alert("Success", "Card deleted successfully");
            } else {
              console.warn("Delete card: unexpected response", res.data);
              throw new Error("Failed to update server");
            }
          } catch (error) {
            console.error("Delete card error:", error);
            Alert.alert("Error", "Failed to delete card");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
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
      Alert.alert("Error", "Could not load payment methods");
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
      <View style={styles.creditCard}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate("PaymentHistory", {
                  editIndex: index,
                  card: item,
                  onCardAdded: fetchCards,
                })
              }
            >
              <Pencil size={14} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteCard(index)}
            >
              <Trash2 size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.cardTop}>
          <View style={styles.chipContainer}>
            <View style={styles.chip}>
              <View style={styles.chipInner} />
              <View style={styles.chipShine} />
            </View>
          </View>

          <Text style={styles.cardBrand}>VISA</Text>
        </View>

        <Text style={styles.cardNumberLarge}>•••• •••• •••• {last4}</Text>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardLabel}>CARD HOLDER</Text>
            <Text style={styles.cardValue}>
              {item.card_holder_name.toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>EXPIRES</Text>
            <Text style={styles.cardValue}>
              {item.expiry_month.padStart(2, "0")}/{item.expiry_year.slice(-2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={styles.subtitle}>Your Saved Cards</Text>

      {/* Single Scrollable Container with Fixed Height */}
      <View style={styles.cardsWrapper}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ flex: 1 }}
          />
        ) : cards.length === 0 ? (
          <Text style={styles.emptyText}>No payment details added yet</Text>
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

      {/* Add New Card Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
        <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.addButtonText}>Add New Card</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111111",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    marginTop: 14,
    marginBottom: 8,
    fontWeight: "700",
    paddingHorizontal: 20,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  /* ==================== MAIN CARDS CONTAINER ==================== */
  cardsWrapper: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    maxHeight: SCREEN_HEIGHT * 0.7, // Fixed reasonable height
  },

  listContent: {
    padding: 10,
    paddingBottom: 20,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
  },

  creditCard: {
    backgroundColor: "#173F73",
    borderRadius: 10,
    padding: 10,
    marginBottom: 9,
    minHeight: 100,
    justifyContent: "space-between",
  },

  chipContainer: { width: 48, height: 35 },
  chip: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f6d365",
  },
  chipInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  rightSection: {
    alignItems: "flex-end",
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
  chipShine: {
    position: "absolute",
    top: 6,
    left: 8,
    width: 30,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 20,
  },
  cardBrand: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    letterSpacing: 1,
  },
  cardValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },

  /* Add Button */
  addButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#0A7C6E",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 10,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    // marginBottom: 5,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  deleteButton: {
    width: 30,
    height: 30,
    backgroundColor: "#EF4444",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  cardNumberLarge: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 2,
    marginTop: 9,
    marginBottom: 9,
  },
});
