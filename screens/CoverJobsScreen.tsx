import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  StyleSheet,
  Alert,
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
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

type Job = {
  id: number;
  title: string;
  siteName: string;
  location: string;
  address: string;
  date: string;
  shiftTime: string;
  rate: string;
  urgency?: string;
};

type Props = { navigation: any };

const CoverJobsScreen = ({ navigation }: Props) => {
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 1,
      title: "Security Guard - Night Shift",
      siteName: "Capital Services",
      location: "Truganina Warehouse",
      address: "21 Tigriswood Blvd, Truganina VIC 3029",
      date: "Monday, 16 June 2026",
      shiftTime: "22:00 - 06:00",
      rate: "$32.50 / hour",
      urgency: "URGENT",
    },
    {
      id: 2,
      title: "Event Security Officer",
      siteName: "Marvel Stadium",
      location: "Docklands",
      address: "740 Bourke St, Docklands VIC 3008",
      date: "Tuesday, 17 June 2026",
      shiftTime: "18:00 - 01:00",
      rate: "$35.00 / hour",
      urgency: "HIGH",
    },
    {
      id: 3,
      title: "Site Security - Day Shift",
      siteName: "Amazon Fulfillment",
      location: "Dandenong South",
      address: "2-10 Dunlop Rd, Dandenong South VIC 3175",
      date: "Wednesday, 18 June 2026",
      shiftTime: "07:00 - 15:00",
      rate: "$31.00 / hour",
    },
    {
      id: 4,
      title: "Retail Security Guard",
      siteName: "Westfield Shopping Centre",
      location: "Chadstone",
      address: "1341 Dandenong Rd, Chadstone VIC 3148",
      date: "Thursday, 19 June 2026",
      shiftTime: "10:00 - 18:00",
      rate: "$29.50 / hour",
      urgency: "URGENT",
    },
    {
      id: 5,
      title: "Night Patrol Officer",
      siteName: "Industrial Park",
      location: "Laverton North",
      address: "45-55 Hammond Rd, Laverton North VIC 3026",
      date: "Friday, 20 June 2026",
      shiftTime: "20:00 - 04:00",
      rate: "$33.75 / hour",
    },
  ]);

  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  const handleAccept = (jobId: number) => {
    setLoadingIds((prev) => [...prev, jobId]);

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
          <Text style={styles.jobTitle}>{item.title}</Text>
          {item.urgency && (
            <View style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>{item.urgency}</Text>
            </View>
          )}
        </View>

        <Text style={styles.siteName}>{item.siteName}</Text>

        <View style={styles.infoRow}>
          <MapPin size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>

        <View style={styles.infoRow}>
          <Clock size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {item.date} • {item.shiftTime}
          </Text>
        </View>

        <Text style={styles.rate}>{item.rate}</Text>

        <Text style={styles.address}>{item.address}</Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAccept(item.id)}
            disabled={isLoading}
          >
            <CheckCircle size={20} color="#fff" />
            <Text style={styles.acceptText}>ACCEPT</Text>
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Cover Jobs</Text>
      </View>

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
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop:20
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
    marginLeft:50,
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
    color: COLORS.textMuted,
    fontSize: 12,
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
