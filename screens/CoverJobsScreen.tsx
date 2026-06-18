

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import LinearGradient from "react-native-linear-gradient";

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://apis.staffoo.com.au/api";

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",
  cardBorder: "rgba(98, 97, 97, 0.83)",
  primary: "#00A99D",
  primaryGlow: "rgba(0,169,157,0.25)",
  primaryBorder: "rgba(0,169,157,0.25)",
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#4A6080",
  success: "#34C88A",
  danger: "#F87171",
  dangerBg: "rgba(248,88,88,0.12)",
  warning: "#F5A623",
  warningBg: "rgba(245,166,35,0.08)",
};

type Job = {
  id: number;
  title: string;
  siteName: string;
  location: string;
  address: string;
  date: string; // e.g. "Thursday, 18 June 2026"
  startTime: string; // e.g. "17:00"
  endTime: string; // e.g. "01:00"
  rate: string;
  urgency?: string;
  status?: string;
};

type Props = { navigation: any };

const CoverJobsScreen = ({ navigation }: Props) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  const fetchAvailableJobs = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("@auth_token");

      console.log("🔑 Token exists:", !!token);

      const response = await axios.get(`${BASE_URL}/jobs/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📡 Full API Response received");

      // ✅ Correct path based on your API response
      let apiJobs = [];

      if (
        response.data?.data?.jobs?.data &&
        Array.isArray(response.data.data.jobs.data)
      ) {
        apiJobs = response.data.data.jobs.data;
      } else if (
        response.data?.jobs?.data &&
        Array.isArray(response.data.jobs.data)
      ) {
        apiJobs = response.data.jobs.data;
      } else if (Array.isArray(response.data?.data)) {
        apiJobs = response.data.data;
      } else {
        console.warn(
          "⚠️ Unexpected structure:",
          Object.keys(response.data || {}),
        );
        apiJobs = [];
      }

      console.log(`📋 Found ${apiJobs.length} available jobs`);

      const formattedJobs: Job[] = apiJobs.map((job: any) => {
        // Date in DD/MM/YYYY format
        let formattedDate = "TBD";
        if (job.start_time) {
          const dateObj = new Date(job.start_time);
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();
          formattedDate = `${day}/${month}/${year}`;
        }

        // Time formatting: HH:mm with space around dash
        const startTime = job.start_time
          ? new Date(job.start_time).toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "TBD";

        const endTime = job.end_time
          ? new Date(job.end_time).toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "TBD";

        return {
          id: job.id,
          title: job.title || "Security Guard Shift",
          siteName: job.site_name || "N/A",
          location: job.state ? job.state.toUpperCase() : "Melbourne",
          address: job.site_address || "Address not available",
          date: formattedDate,
          startTime,
          endTime,
          rate: job.hourly_rate ? `$${job.hourly_rate}/hour` : "$32.50 / hour",
          urgency:
            job.job_status || (job.publish_status === 1 ? "URGENT" : undefined),
          status: job.job_status
            ? job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)
            : "Pending",
        };
      });

      setJobs(formattedJobs);
    } catch (error: any) {
      console.error("❌ Full Error:", error);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
      }

      Toast.show({
        type: "error",
        text1: "Failed to load jobs",
        text2: "Please try again later",
      });
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableJobs();
  }, []);

  useEffect(() => {
    fetchAvailableJobs();
  }, []);

  const handleAccept = async (jobId: number) => {
    setLoadingIds((prev) => [...prev, jobId]);

    try {
      const token = await AsyncStorage.getItem("@auth_token");
      // Uncomment when backend endpoint is ready
      // await axios.post(`${BASE_URL}/jobs/${jobId}/accept`, {}, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });

      setTimeout(() => {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        setLoadingIds((prev) => prev.filter((id) => id !== jobId));

        Toast.show({
          type: "success",
          text1: "Job Accepted!",
          text2: "You have been assigned to this shift.",
          position: "top",
        });
      }, 800);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Failed to accept job",
      });
      setLoadingIds((prev) => prev.filter((id) => id !== jobId));
    }
  };

  const handleReject = (jobId: number) => {
    Alert.alert(
      "Reject Job",
      "Are you sure you want to reject this cover job?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            setJobs((prev) => prev.filter((j) => j.id !== jobId));
            Toast.show({
              type: "error",
              text1: "Job Rejected",
              position: "top",
            });
          },
        },
      ],
    );
  };

  const renderJobCard = ({ item }: { item: Job }) => {
    const isLoading = loadingIds.includes(item.id);

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          {/* <Text style={styles.jobTitle}>{item.title}</Text> */}
          {item.siteName && (
            <Text style={styles.siteName}>{item.siteName}</Text>
          )}
          {item.status && (
            <View style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>{item.status}</Text>
            </View>
          )}
        </View>

        {/* {item.siteName && <Text style={styles.siteName}>{item.siteName}</Text>} */}

        <View style={styles.infoRow}>
          <MapPin size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>

        {/* Date and Time Row */}
        <View style={styles.infoRow}>
          <Clock size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {item.date} • {item.startTime} - {item.endTime}
          </Text>
        </View>

        {/* <Text style={styles.rate}>{item.rate}</Text> */}
        <Text style={styles.address}>{item.address}</Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept(item.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.acceptText}>ACCEPT</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleReject(item.id)}
          >
            <XCircle size={20} color={COLORS.danger} />
            <Text style={styles.rejectText}>REJECT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Cover Jobs</Text>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Briefcase size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                No cover jobs available right now
              </Text>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchAvailableJobs}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (your existing styles remain the same)

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    // backgroundColor: COLORS.surface,
    paddingTop: 20, // Extra top padding
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginLeft: 50,
  },
  listContent: {
    padding: 15,
    paddingTop: 5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minHeight: 200, // Increased card height
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  urgencyBadge: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  urgencyText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: "bold",
  },
  siteName: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  infoText: {
    marginLeft: 8,
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  rate: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    marginVertical: 5,
  },
  address: {
    color: '#ededed80',
    fontSize: 12,
    marginTop:5,
    lineHeight: 12,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  acceptText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  rejectText: {
    color: COLORS.danger,
    fontWeight: "600",
    fontSize: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
  },
});

export default CoverJobsScreen;
