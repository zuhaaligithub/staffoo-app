import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  Calendar,
  Clock,
  Briefcase,
  Building2,
  MapPin,
  ArrowLeft,
  Grid,
  User,
} from "lucide-react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { BASE_URL } from "../services/authApi";

const COLORS = {
  primary: "#89E7D0",
  primaryDark: "#4FCBB3",

  background: "#001F3F",
  surface: "#0A2A4D",
  surface2: "#12243A",

  card: "#FFFFFF",
  cardBorder: "#DCE6F2",

  text: "#001F3F",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",

  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",

  border: "#E2E8F0",
};

export default function AsapJobDetails({ route, navigation }: any) {
  const job = route?.params?.job;
  const selectedStaffId = route?.params?.staff_id;
  const selectedStaff = route?.params?.selectedStaff;
  const roster =
    job?.roster?.roster ||
    job?.additionalData?.roster?.roster ||
    job?.roster ||
    job ||
    {};
  const rosterId = roster?.roster?.id || roster?.id || null;
  console.log(
    "[AsapJobDetails] Full job from route:",
    JSON.stringify(job, null, 2),
  );
  console.log(
    "[AsapJobDetails] Selected staff_id (if contractor):",
    selectedStaffId,
  );
  console.log("[AsapJobDetails] rosterId:", rosterId);
  const distance =
    job?.distance ||
    job?.roster?.distance ||
    job?.additionalData?.roster?.distance ||
    null;

  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [accepting, setAccepting] = useState(false);
  const latitude = roster?.site?.coordinates
    ? parseFloat(roster.site.coordinates.split(",")[0])
    : 31.5204;
  const longitude = roster?.site?.coordinates
    ? parseFloat(roster.site.coordinates.split(",")[1])
    : 74.3587;

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "—";
    const [date] = dateTime.split(" ");
    const [year, month, day] = date.split("-");
    return `${day}-${month}-${year}`;
  };

  const formatTime = (start: string, end: string) => {
    if (!start || !end) return "—";
    const startTime = start.split(" ")[1]?.slice(0, 5) || "";
    const endTime = end.split(" ")[1]?.slice(0, 5) || "";
    return `${startTime} – ${endTime}`;
  };

  const handleAccept = async () => {
    if (!rosterId) {
      Toast.show({
        type: "error",
        text1: "Cannot accept job",
        text2: "Roster ID is missing",
        position: "bottom",
      });
      return;
    }

    Alert.alert(
      "Confirm Accept",
      `Are you sure you want to accept this job? `,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              setAccepting(true);
              const userJson = await AsyncStorage.getItem("user");
              if (!userJson) throw new Error("User data not found");
              const user = JSON.parse(userJson);
              const userId = user?.id;
              if (!userId) throw new Error("User ID missing");
              const token = await AsyncStorage.getItem("@auth_token");
              if (!token) throw new Error("No auth token");
              const payload = {
                roster_id: rosterId,
              };
              let acceptUrl = `${BASE_URL}/asap-jobs/accept/${userId}`;
              if (selectedStaffId) {
                acceptUrl = `${BASE_URL}/asap-jobs/accept/${selectedStaffId}`;
                console.log(
                  "[ACCEPT] Using staff ID in URL path:",
                  selectedStaffId,
                );
              }
              console.log("[ACCEPT API FULL REQUEST]");
              console.log("URL:", acceptUrl);
              console.log("Headers:", {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              });
              console.log("Payload:", JSON.stringify(payload, null, 2));

              const response = await axios.post(acceptUrl, payload, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                timeout: 15000,
              });
              const data = response.data;

              if (data?.success === true) {
                Toast.show({
                  type: "success",
                  text1: "Success!",
                  text2:
                    "Job accepted" +
                    (selectedStaffId ? " (assigned to staff)" : ""),
                  position: "bottom",
                });

                setTimeout(() => navigation.goBack(), 800);
              } else {
                Toast.show({
                  type: "error",
                  text1: data?.message || "Failed to accept job",
                  position: "bottom",
                });
              }
            } catch (error: any) {
              console.error("[ACCEPT API ERROR]:", error);
              Toast.show({
                type: "error",
                text1: "Failed to accept job",
                text2: error.message || "Network/server error",
                position: "bottom",
              });
            } finally {
              setAccepting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBox}
        >
          <ArrowLeft size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
      </View>
      <View style={styles.mapCard}>
        <MapView
          style={styles.map}
          mapType={mapType}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={{ latitude, longitude }} />
        </MapView>
        <View style={styles.mapToggle}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mapType === "standard" && styles.activeToggle,
            ]}
            onPress={() => setMapType("standard")}
          >
            <Text
              style={{
                color: mapType === "standard" ? "#fff" : COLORS.text,
                fontWeight: "600",
              }}
            >
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mapType === "satellite" && styles.activeToggle,
            ]}
            onPress={() => setMapType("satellite")}
          >
            <Text
              style={{
                color: mapType === "satellite" ? "#fff" : COLORS.text,
                fontWeight: "600",
              }}
            >
              Satellite
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.row}>
          <Calendar size={20} color={COLORS.primaryDark} />
          <Text style={styles.text}>{formatDate(roster?.start)}</Text>
        </View>
        <View style={styles.row}>
          <Clock size={20} color={COLORS.primaryDark} />
          <Text style={styles.text}>
            {formatTime(roster?.start, roster?.end)}
          </Text>
        </View>
        {/* <View style={styles.row}>
          <Briefcase size={20} color={COLORS.primaryDark} />
          <Text style={styles.text}>
            {roster?.job_title || 'ASAP Security'}
          </Text>
        </View> */}
        <View style={styles.row}>
          <Building2 size={20} color={COLORS.primaryDark} />
          <Text style={styles.text}>
            {roster?.site?.site_name || "Unknown Site"}
          </Text>
        </View>
        <View style={styles.row}>
          <MapPin size={20} color={COLORS.primaryDark} />
          <Text style={styles.address}>
            {roster?.site?.address || roster?.address || "No address available"}
          </Text>
        </View>
        {distance && (
          <Text style={styles.distance}>Within {distance} km radius</Text>
        )}
        {selectedStaffId && (
          <View style={styles.row}>
            <User size={20} color={COLORS.primaryDark} />
            <Text style={styles.text}>
              Assigned to staff ID: {selectedStaffId}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.acceptText}>
              {/* Accept {rosterId ? `(#${rosterId})` : ''} */}
              Accept
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginLeft: "24%",
    color: COLORS.card,
  },
  backBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  detailsContainer: {
    padding: 16,
    marginHorizontal: 18,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  address: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  distance: {
    fontWeight: "700",
    marginBottom: 20,
    color: COLORS.primaryDark,
    fontSize: 15,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  mapCard: {
    height: 220,
    marginHorizontal: 18,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 18,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  mapToggle: {
    position: "absolute",
    top: 15,
    left: 15,
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    overflow: "hidden",
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  activeToggle: {
    backgroundColor: COLORS.primaryDark,
  },
});
