import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import Pdf from "react-native-pdf";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Check } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../services/authApi";

export default function PoliciesScreen() {
  const navigation = useNavigation();

  const source =
    Platform.OS === "android"
      ? { uri: "bundle-assets://policies.pdf" }
      : require("../assets/policies.pdf");

  const [isAccepted, setIsAccepted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckboxDisabled, setIsCheckboxDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get user-specific key
  const getPolicyKey = async () => {
    const uid = await AsyncStorage.getItem("@user_id");
    return uid ? `@policy_accepted_${uid}` : "@policy_accepted";
  };

  // Load status - User Specific
  useFocusEffect(
    useCallback(() => {
      const loadPolicyStatus = async () => {
        setIsLoading(true);
        try {
          const policyKey = await getPolicyKey();
          const locallyAccepted = await AsyncStorage.getItem(policyKey);

          if (locallyAccepted === "true") {
            setIsAccepted(true);
            setIsCheckboxDisabled(true);
            setIsLoading(false);
            return;
          }

          // Call API only if not accepted locally
          const uid = await AsyncStorage.getItem("@user_id");
          const token = await AsyncStorage.getItem("@auth_token");

          if (!uid || !token) {
            setIsLoading(false);
            return;
          }

          const response = await fetch(`${BASE_URL}/staff-profile/${uid}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          const data = await response.json();

          console.log("Staff Profile URL:", `${BASE_URL}/staff-profile/${uid}`);
          console.log("Staff Profile Status:", response.status);
          console.log("Staff Profile Response:", data);

          if (!response.ok) {
            throw new Error(
              data?.message ||
                `Staff profile request failed with status ${response.status}`,
            );
          }

          const isPolicyAccepted =
            data?.success === true &&
            Number(data?.data?.is_policy_accepted) === 1;

          setIsAccepted(isPolicyAccepted);
          setIsCheckboxDisabled(isPolicyAccepted);

          if (isPolicyAccepted) {
            await AsyncStorage.setItem(policyKey, "true");
          }

          setIsAccepted(isPolicyAccepted);
          setIsCheckboxDisabled(isPolicyAccepted);

          if (isPolicyAccepted) {
            await AsyncStorage.setItem(policyKey, "true");
          }
        } catch (error) {
          console.log("Failed to load policy status:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadPolicyStatus();
    }, []),
  );

  const handleToggleCheckbox = async () => {
    if (isCheckboxDisabled || isUpdating) return;

    const newValue = !isAccepted;
    setIsAccepted(newValue);
    setIsUpdating(true);

    try {
      const uid = await AsyncStorage.getItem("@user_id");
      const token = await AsyncStorage.getItem("@auth_token");

      if (!uid) throw new Error("User session not found");

      const response = await fetch(`${BASE_URL}/accept-policy/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_policy_accepted: newValue ? "yes" : "no" }),
      });

      const responseData = await response.json();

      if (!response.ok)
        throw new Error(responseData?.message || "Request failed");

      Alert.alert(
        "Success",
        responseData.message || "Policy accepted successfully",
      );

      if (newValue) {
        setIsCheckboxDisabled(true);
        const policyKey = await getPolicyKey();
        await AsyncStorage.setItem(policyKey, "true");
      }
    } catch (error) {
      console.log("Error:", error);
      setIsAccepted(!newValue); // revert
      Alert.alert("Error", "Failed to update policy preference.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.title}>Privacy Policy</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.policyBox}>
        <View style={styles.pdfWrapper}>
          <Pdf
            source={source}
            style={styles.pdf}
            trustAllCerts={false}
            onError={(error) => console.log("PDF Error:", error)}
          />
        </View>

        <View style={styles.boxFooter}>
          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.8}
            onPress={handleToggleCheckbox}
            disabled={isUpdating || isCheckboxDisabled || isLoading}
          >
            <View
              style={[styles.checkbox, isAccepted && styles.checkboxActive]}
            >
              {isAccepted && <Check size={14} color="#fff" strokeWidth={3} />}
            </View>

            <View style={styles.checkboxTextContainer}>
              <Text
                style={[
                  styles.checkboxText,
                  isCheckboxDisabled && styles.disabledText,
                ]}
              >
                I have read and agree to the Privacy Policy
              </Text>
            </View>

            {isUpdating && (
              <ActivityIndicator
                size="small"
                color="#1A8754"
                style={styles.loader}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6", paddingTop: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "600", color: "#111827" },
  policyBox: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  pdfWrapper: { flex: 1 },
  pdf: { flex: 1, width: "100%" },
  boxFooter: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  checkboxRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxActive: {
    backgroundColor: "#1A8754",
    borderColor: "#1A8754",
  },
  checkboxTextContainer: { flex: 1, marginLeft: 12 },
  checkboxText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  disabledText: { color: "#9CA3AF" },
  loader: { marginLeft: 10 },
});
