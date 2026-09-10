
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Pdf from "react-native-pdf";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ArrowLeft, Check } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../services/authApi";

type UserType = "staff" | "contractor" | "customer";

const VALID_USER_TYPES: UserType[] = ["staff", "contractor", "customer"];


const IOS_PDF_ASSETS: Record<UserType, any> = {
  staff: require("../assets/staff_policy.pdf"),
  contractor: require("../assets/contractor_policy.pdf"),
  customer: require("../assets/customer_policy.pdf"),
};


const ANDROID_ASSET_FILENAMES: Record<UserType, string> = {
  staff: "staff_policy.pdf",
  contractor: "contractor_policy.pdf",
  customer: "customer_policy.pdf",
};

function resolveUserType(raw: string | null): UserType {
  const normalized = (raw || "").toLowerCase();
  return (VALID_USER_TYPES as string[]).includes(normalized)
    ? (normalized as UserType)
    : "customer";
}

function getPdfSourceForUserType(userType: UserType) {
  if (Platform.OS === "android") {
    return { uri: `bundle-assets://${ANDROID_ASSET_FILENAMES[userType]}` };
  }
  return IOS_PDF_ASSETS[userType];
}

export default function PoliciesScreen() {
  const navigation = useNavigation();

  const [userType, setUserType] = useState<UserType>("customer");
  const [isAccepted, setIsAccepted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCheckboxDisabled, setIsCheckboxDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const getPolicyKey = (uid: string | null) =>
    uid ? `@policy_accepted_${uid}` : "@policy_accepted";

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadPolicyStatus = async () => {
        setIsLoading(true);
        setPdfError(null);

        try {
          const storedUserType = await AsyncStorage.getItem("@user_type");
          const resolvedUserType = resolveUserType(storedUserType);
          if (isActive) setUserType(resolvedUserType);

          const uid = await AsyncStorage.getItem("@user_id");
          const policyKey = getPolicyKey(uid);
          const locallyAccepted = await AsyncStorage.getItem(policyKey);

          if (locallyAccepted === "true") {
            if (isActive) {
              setIsAccepted(true);
              setIsCheckboxDisabled(true);
            }
            return;
          }

          const token = await AsyncStorage.getItem("@auth_token");
          if (!uid || !token) return;

          const response = await fetch(`${BASE_URL}/staff-profile/${uid}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data?.message ||
                `Staff profile request failed with status ${response.status}`,
            );
          }

          const isPolicyAccepted =
            data?.success === true &&
            Number(data?.data?.is_policy_accepted) === 1;

          if (isActive) {
            setIsAccepted(isPolicyAccepted);
            setIsCheckboxDisabled(isPolicyAccepted);
          }

          if (isPolicyAccepted) {
            await AsyncStorage.setItem(policyKey, "true");
          }
        } catch (error) {
          console.log("Failed to load policy status:", error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      loadPolicyStatus();

      return () => {
        isActive = false;
      };
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

      const payload = {
        is_policy_accepted: newValue ? "yes" : "no",
      };

      console.log("Policy API Payload:", payload);

      const response = await fetch(`${BASE_URL}/accept-policy/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.message || "Request failed");
      }

      Alert.alert(
        "Success",
        responseData.message || "Policy accepted successfully",
      );

      if (newValue) {
        setIsCheckboxDisabled(true);
        const policyKey = getPolicyKey(uid);
        await AsyncStorage.setItem(policyKey, "true");
      }
    } catch (error) {
      console.log("Error:", error);
      setIsAccepted(!newValue); // revert on failure
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
          {isLoading ? (
            <ActivityIndicator
              style={{ flex: 1 }}
              size="large"
              color="#1A8754"
            />
          ) : pdfError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{pdfError}</Text>
            </View>
          ) : (
            <Pdf
              key={userType}
              source={getPdfSourceForUserType(userType)}
              style={styles.pdf}
              onLoadComplete={(numberOfPages) => {
                console.log(
                  `Loaded ${userType} policy, pages: ${numberOfPages}`,
                );
              }}
              onError={(error) => {
                console.log("PDF Error:", error);
                setPdfError(
                  "Unable to load the policy document. Please try again later.",
                );
              }}
            />
          )}
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
  pdfWrapper: { flex: 1, width: "100%", height: "100%" },
  pdf: { flex: 1, width: "100%", height: "100%" },
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: { color: "#B91C1C", textAlign: "center", fontSize: 14 },
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

/**
 * SETUP NOTES — required for the fix to work, not optional:
 *
 * 1. metro.config.js — tell Metro to treat .pdf as a binary asset:
 *
 *    const { getDefaultConfig } = require("metro-config");
 *    module.exports = (async () => {
 *      const config = await getDefaultConfig();
 *      config.resolver.assetExts.push("pdf");
 *      return config;
 *    })();
 *
 * 2. Android — after step 1, a release/debug build will automatically
 *    copy files required via require("../assets/xxx.pdf") into the APK's
 *    assets folder, which is what "bundle-assets://xxx.pdf" reads from.
 *    Clean + rebuild (not just reload) after changing metro.config.js:
 *      cd android && ./gradlew clean && cd ..
 *
 * 3. iOS — Xcode does NOT auto-copy require()'d non-image files. Open
 *    ios/YourApp.xcworkspace, drag staff_policy.pdf / contractor_policy.pdf
 *    / customer_policy.pdf into the project navigator, and make sure they're
 *    checked under Target > Build Phases > Copy Bundle Resources.
 *
 * 4. @user_type must already be saved to AsyncStorage at login (as
 *    "staff" | "contractor" | "customer", case-insensitive) for this
 *    screen to pick the right document.
 */
