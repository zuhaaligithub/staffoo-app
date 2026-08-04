// import React, { useEffect, useState } from "react";
// import {
//   SafeAreaView,
//   ScrollView,
//   View,
//   Text,
//   TouchableOpacity,
//   StatusBar,
//   Alert,
//   FlatList,
//   StyleSheet,
//   Image,
//   ActivityIndicator,
// } from "react-native";
// import { ArrowLeft, Award, CheckCircle, Clock } from "lucide-react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { BASE_URL, getAuthToken } from "../services/authApi";

// const THEME_COLOR = "#0A7C6E";

// const COLORS = {
//   background: "#030508",
//   surface: "#07111A",
//   card: "#0D1421",

//   primary: "#00A99D",
//   primaryGlow: "rgba(0,169,157,0.25)",
//   primaryBorder: "rgba(0,169,157,0.25)",

//   text: "#FFFFFF",
//   textSecondary: "#94A3B8",
//   textMuted: "#4A6080",

//   success: "#34C88A",
//   warning: "#F5A623",
//   danger: "#F87171",

//   border: "rgba(255,255,255,0.08)",
//   heroBg1: "#0D1F2D",
//   heroBg2: "#061014",
// };

// // ✅ GLOBAL HELPER
// const isCompleted = (status: string) =>
//   ["completed", "passed"].includes(status);

// export default function StaffInductionScreen({
//   navigation,
// }: {
//   navigation: any;
// }) {
//   const [inductions, setInductions] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const [user, setUser] = useState<any>(null);
//   const [profileImage, setProfileImage] = useState<string | null>(null);

//   const recentInduction = inductions[0];

//   useEffect(() => {
//     loadUserAndInductions();
//   }, []);

//   useEffect(() => {
//     const unsubscribe = navigation.addListener("focus", () => {
//       loadUserAndInductions();
//     });
//     return unsubscribe;
//   }, [navigation]);

//   const loadUserAndInductions = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // ✅ Get cached values
//       const cachedUserId = await AsyncStorage.getItem("@user_id");
//       const cachedUser = await AsyncStorage.getItem("user");
//       const token = await getAuthToken();

//       // ✅ Check token
//       if (!token) {
//         setError("Session expired. Please login again.");
//         setLoading(false);
//         return;
//       }

//       let userId: string | null = cachedUserId || null;

//       // ✅ Parse cached user
//       if (cachedUser) {
//         const parsedUser = JSON.parse(cachedUser);

//         console.log(
//           "INDUCTION USER DATA:",
//           JSON.stringify(parsedUser, null, 2),
//         );

//         setUser(parsedUser);

//         // ✅ Find user ID safely
//         userId =
//           userId ||
//           parsedUser?.id ||
//           parsedUser?.user?.id ||
//           parsedUser?.staff?.id ||
//           parsedUser?.contractor?.id ||
//           parsedUser?.customer?.id ||
//           parsedUser?.guard_id ||
//           null;

//         // ✅ Handle profile image by user type
//         let imageUri: string | null = null;

//         if (parsedUser?.user_type === "staff") {
//           imageUri = parsedUser?.staff?.profile_image;
//         } else if (parsedUser?.user_type === "contractor") {
//           imageUri = parsedUser?.contractor?.profile_image;
//         } else if (parsedUser?.user_type === "customer") {
//           imageUri =
//             parsedUser?.customer?.profile_image || parsedUser?.profile_image;
//         }

//         // ✅ Set profile image
//         if (imageUri) {
//           const fullImage = imageUri.startsWith("http")
//             ? imageUri
//             : // : `https://apis.staffoo.com.au/storage/${imageUri}`;
//               `https://apis-staging.staffoo.com.au/storage/${imageUri}`;
//           setProfileImage(fullImage);
//         }
//       }

//       // ✅ Final validation
//       if (!userId) {
//         setError("User ID not found. Please login again.");
//         setLoading(false);
//         return;
//       }

//       // ✅ Fetch inductions
//       await fetchInductions(userId, token);
//     } catch (err) {
//       console.log("LOAD INDUCTION ERROR:", err);

//       setError("Failed to load data");
//       setLoading(false);
//     }
//   };

//   const fetchInductions = async (userId: string, token: string) => {
//     try {
//       const response = await fetch(`${BASE_URL}/get-questionnaire/${userId}`, {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Accept: "application/json",
//         },
//       });

//       const data = await response.json();

//       // ✅ Handle "no data" case safely
//       if (
//         !data.success ||
//         !Array.isArray(data.data) ||
//         data.data.length === 0
//       ) {
//         setInductions([]); // important
//         return;
//       }

//       const formatted = data.data
//         .sort(
//           (a: any, b: any) =>
//             new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
//         )
//         .map((item: any) => ({
//           id: item.id,
//           title: item.title,
//           subtitle: item.sub_heading?.[0] || "",
//           status: item.status || "pending",
//           questions: item.questionnaire?.length || 0,
//           date: item.created_at
//             ? new Date(item.created_at).toLocaleDateString("en-AU", {
//                 day: "numeric",
//                 month: "short",
//                 year: "numeric",
//               })
//             : "Recently Added",
//           questionnaire: item.questionnaire,
//           created_at: item.created_at,
//         }));

//       setInductions(formatted);
//     } catch (err) {
//       setError("Failed to load inductions");
//       setInductions([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const capitalizeText = (text: string = "") => {
//     return text
//       .toLowerCase()
//       .split(" ")
//       .filter(Boolean)
//       .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(" ");
//   };

//   const getInitials = (name: string) => {
//     if (!name) return "U";
//     const parts = name.trim().split(" ").filter(Boolean);
//     if (parts.length === 1) return parts[0][0].toUpperCase();
//     return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
//   };

//   const handleStartInduction = (item: any) => {
//     if (isCompleted(item.status)) {
//       Alert.alert("Completed", "You have already passed this induction.");
//       return;
//     }

//     const inductionTitle = capitalizeText(item.title || "Induction");

//     Alert.alert(
//       inductionTitle,
//       `This induction contains ${item.questions} ${
//         item.questions === 1 ? "question" : "questions"
//       }.\n\nReady to start?`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Start Now",
//           onPress: () =>
//             navigation.navigate("InductionQuestions", {
//               inductionId: item.id,
//             }),
//         },
//       ],
//     );
//   };

//   const renderInductionItem = ({ item }: { item: any }) => {
//     const done = isCompleted(item.status);

//     return (
//       <TouchableOpacity
//         style={[
//           styles.listCard,
//           done ? styles.completedBorder : styles.pendingBorder,
//         ]}
//         onPress={() => handleStartInduction(item)}
//       >
//         {done && (
//           <View style={styles.tickTopRight}>
//             <CheckCircle size={22} color="#187139" fill="#22c55e" />
//           </View>
//         )}

//         <View style={styles.iconContainer}>
//           <Award size={32} color={done ? "#21954c" : THEME_COLOR} />
//         </View>

//         <View style={styles.listContent}>
//           <Text style={styles.listTitle}>{capitalizeText(item.title)}</Text>
//           {/* <Text style={styles.listSubtitle}>
//             {item.subtitle} • {item.date}
//           </Text> */}
//           <Text style={styles.questionsText}>
//             {item.questions} {item.questions === 1 ? "Question" : "Questions"}
//           </Text>

//           {done ? (
//             <View style={styles.completedBadge}>
//               <CheckCircle size={18} color="#22c55e" />
//               <Text style={styles.completedText}>Completed</Text>
//             </View>
//           ) : (
//             <View style={styles.pendingBadge}>
//               <Clock size={18} color="#f59e0b" />
//               <Text style={styles.pendingText}>Pending</Text>
//             </View>
//           )}
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View
//           style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
//         >
//           <ActivityIndicator size="large" color={THEME_COLOR} />
//           <Text style={{ marginTop: 12, color: "white" }}>
//             Loading Inductions...
//           </Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   const recentDone = recentInduction
//     ? isCompleted(recentInduction.status)
//     : false;

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" backgroundColor="#fff" />

//       {/* HEADER */}
//       <View style={styles.headerRow}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <ArrowLeft size={24} color="#fff" />
//         </TouchableOpacity>

//         <View style={styles.headerTitleContainer}>
//           <Text style={styles.greeting}>
//             {capitalizeText(
//               user?.name ||
//                 user?.staff?.name ||
//                 user?.contractor?.name ||
//                 user?.customer?.name ||
//                 "User",
//             )}{" "}
//             👋
//           </Text>

//           <Text style={styles.staffName}>Staff Induction Program</Text>
//         </View>

//         <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
//           {profileImage ? (
//             <Image source={{ uri: profileImage }} style={styles.avatarSmall} />
//           ) : (
//             <View style={styles.initialsAvatarSmall}>
//               <Text style={styles.initialsTextSmall}>
//                 {getInitials(
//                   user?.name ||
//                     user?.staff?.name ||
//                     user?.contractor?.name ||
//                     user?.customer?.name ||
//                     "U",
//                 )}
//               </Text>
//             </View>
//           )}
//         </TouchableOpacity>
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {error && <Text style={{ color: "red" }}>{error}</Text>}

//         {/* RECENT CARD */}
//         {recentInduction && (
//           <TouchableOpacity
//             style={[
//               styles.recentCard,
//               recentDone && styles.completedCardBorder,
//             ]}
//             onPress={() => handleStartInduction(recentInduction)}
//           >
//             <View style={styles.recentIcon}>
//               <Award size={48} color={recentDone ? "#195f33" : THEME_COLOR} />
//             </View>

//             <View style={styles.recentContent}>
//               {/* <Text style={styles.recentSubtitle}>
//                 {recentInduction.subtitle}
//               </Text> */}
//               <Text style={styles.recentTitle}>
//                 {capitalizeText(recentInduction.title)}
//               </Text>
//               <Text style={styles.recentDate}>{recentInduction.date}</Text>

//               <Text style={styles.questionsCount}>
//                 {recentInduction.questions}{" "}
//                 {recentInduction.questions === 1 ? "Question" : "Questions"}
//               </Text>

//               {/* ✅ START BUTTON / COMPLETED */}
//               {!recentDone ? (
//                 <TouchableOpacity
//                   style={styles.startButton}
//                   onPress={() => handleStartInduction(recentInduction)}
//                 >
//                   <Text style={styles.startButtonText}>Start Induction</Text>
//                 </TouchableOpacity>
//               ) : (
//                 <View
//                   style={{
//                     flexDirection: "row",
//                     marginTop: 12,
//                     alignItems: "center",
//                   }}
//                 >
//                   <CheckCircle size={18} color="#22c55e" />
//                   <Text
//                     style={{
//                       marginLeft: 6,
//                       color: "#22c55e",
//                       fontWeight: "700",
//                     }}
//                   >
//                     Completed
//                   </Text>
//                 </View>
//               )}
//             </View>
//           </TouchableOpacity>
//         )}

//         <Text style={styles.sectionTitle}>All Inductions</Text>
//         {inductions.length === 0 && !loading && (
//           <View style={{ alignItems: "center", marginTop: 40 }}>
//             <Text style={{ fontSize: 16, fontWeight: "600", color: "#64748b" }}>
//               No induction found
//             </Text>
//           </View>
//         )}
//         <FlatList
//           data={inductions}
//           renderItem={renderInductionItem}
//           keyExtractor={(item, index) => `${item.id || index}`}
//           scrollEnabled={false}
//         />
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// /* Styles remain the same as your original */
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: COLORS.background,
//     paddingTop: 25,
//   },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",

//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     marginHorizontal: 16,
//     marginTop: 10,

//     borderRadius: 18,

//     backgroundColor: COLORS.surface,
//     borderWidth: 1,
//     borderColor: COLORS.border,
//   },
//   backBox: {
//     width: 42,
//     height: 42,
//     borderRadius: 12,
//     backgroundColor: "#cedff0",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   headerTitleContainer: { flex: 1, marginLeft: 14 },
//   greeting: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: COLORS.text,
//   },

//   staffName: {
//     fontSize: 13,
//     color: COLORS.textSecondary,
//     marginTop: 2,
//   },
//   rightProfile: { width: 44, height: 44, borderRadius: 22 },
//   avatarSmall: { width: 44, height: 44, borderRadius: 22 },
//   initialsAvatarSmall: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: "#424749",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   initialsTextSmall: { color: "#fff", fontSize: 16, fontWeight: "700" },

//   scrollContent: { padding: 20 },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: COLORS.text,
//     marginBottom: 12,
//     marginTop: 18,
//   },
//   completedCardBorder: {
//     borderWidth: 1,
//     borderColor: "#22c55e",
//   },

//   recentCard: {
//     borderRadius: 22,
//     padding: 10,
//     flexDirection: "row",

//     backgroundColor: COLORS.card,
//     borderWidth: 1,
//     borderColor: COLORS.border,

//     shadowColor: "#000",
//     shadowOpacity: 0.25,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   recentIcon: {
//     width: 60,
//     height: 60,
//     borderRadius: 18,

//     backgroundColor: COLORS.primaryGlow,
//     borderWidth: 1,
//     borderColor: COLORS.primaryBorder,

//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 16,
//   },
//   recentContent: { flex: 1 },
//   recentSubtitle: { color: THEME_COLOR, fontSize: 15, fontWeight: "600" },
//   recentTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: "#fff",
//     marginVertical: 6,
//   },
//   recentDate: { color: "#64748b", fontSize: 12 },
//   questionsCount: {
//     color: "#fff",
//     fontSize: 13,
//     fontWeight: "600",
//     marginTop: 4,
//   },
//   startButton: {
//     backgroundColor: COLORS.primary,
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 14,
//     marginTop: 12,

//     shadowColor: COLORS.primary,
//     shadowOpacity: 0.25,
//     shadowRadius: 10,
//     elevation: 4,

//     alignSelf: "flex-start",
//   },

//   startButtonText: {
//     color: "#001F3F",
//     fontWeight: "800",
//     fontSize: 14,
//   },

//   listCard: {
//     flexDirection: "row",
//     alignItems: "center",

//     backgroundColor: COLORS.card,

//     padding: 16,
//     borderRadius: 18,

//     marginBottom: 14,

//     borderWidth: 1,
//     borderColor: COLORS.border,
//   },
//   completedBorder: {
//     borderWidth: 1,
//     borderColor: "#22c55e",
//   },

//   pendingBorder: {
//     borderWidth: 1.8,
//     borderColor: "#ef4444",
//   },

//   tickTopRight: {
//     position: "absolute",
//     top: 10,
//     right: 10,
//     zIndex: 10,
//   },
//   iconContainer: {
//     width: 52,
//     height: 52,
//     borderRadius: 16,

//     backgroundColor: "rgba(137, 231, 208, 0.08)",
//     borderWidth: 1,
//     borderColor: COLORS.border,

//     alignItems: "center",
//     justifyContent: "center",
//     marginRight: 14,
//   },
//   listContent: { flex: 1 },
//   listTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
//   listSubtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
//   questionsText: {
//     fontSize: 13,
//     color: "#fff",
//     fontWeight: "600",
//     marginTop: 6,
//   },

//   completedText: {
//     color: COLORS.success,
//     fontWeight: "700",
//     marginLeft: 6,
//   },

//   pendingText: {
//     color: COLORS.warning,
//     fontWeight: "700",
//     marginLeft: 6,
//   },
//   completedBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 10,

//     backgroundColor: "rgba(52, 200, 138, 0.12)",
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//     borderRadius: 12,

//     alignSelf: "flex-start",
//   },

//   pendingBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 10,

//     backgroundColor: "rgba(245, 166, 35, 0.12)",
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//     borderRadius: 12,

//     alignSelf: "flex-start",
//   },
// });

import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  FlatList,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  FileQuestion,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL, getAuthToken } from "../services/authApi";

const THEME_COLOR = "#0A7C6E";

const COLORS = {
  background: "#030508",
  surface: "#07111A",
  card: "#0D1421",

  primary: "#00A99D",
  primaryGlow: "rgba(0,169,157,0.25)",
  primaryBorder: "rgba(0,169,157,0.25)",

  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  textMuted: "#4A6080",

  success: "#34C88A",
  warning: "#F5A623",
  danger: "#F87171",

  border: "rgba(255,255,255,0.08)",
  heroBg1: "#0D1F2D",
  heroBg2: "#061014",
};

const isCompleted = (status: string = "") =>
  ["completed", "passed"].includes(status.toLowerCase());

export default function StaffInductionScreen({
  navigation,
}: {
  navigation: any;
}) {
  const [inductions, setInductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const recentInduction = inductions[0];

  useEffect(() => {
    loadUserAndInductions();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadUserAndInductions();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserAndInductions = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Get cached values
      const cachedUserId = await AsyncStorage.getItem("@user_id");
      const cachedUser = await AsyncStorage.getItem("user");
      const token = await getAuthToken();

      // ✅ Check token
      if (!token) {
        setError("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      let userId: string | null = cachedUserId || null;

      // ✅ Parse cached user
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);

        console.log(
          "INDUCTION USER DATA:",
          JSON.stringify(parsedUser, null, 2),
        );

        setUser(parsedUser);

        // ✅ Find user ID safely
        userId =
          userId ||
          parsedUser?.id ||
          parsedUser?.user?.id ||
          parsedUser?.staff?.id ||
          parsedUser?.contractor?.id ||
          parsedUser?.customer?.id ||
          parsedUser?.guard_id ||
          null;

        // ✅ Handle profile image by user type
        let imageUri: string | null = null;

        if (parsedUser?.user_type === "staff") {
          imageUri = parsedUser?.staff?.profile_image;
        } else if (parsedUser?.user_type === "contractor") {
          imageUri = parsedUser?.contractor?.profile_image;
        } else if (parsedUser?.user_type === "customer") {
          imageUri =
            parsedUser?.customer?.profile_image || parsedUser?.profile_image;
        }

        // ✅ Set profile image
        if (imageUri) {
          const fullImage = imageUri.startsWith("http")
            ? imageUri
            //  : `https://apis.staffoo.com.au/storage/${imageUri}`;
            :  `https://apis-staging.staffoo.com.au/storage/${imageUri}`;
          setProfileImage(fullImage);
        }
      }

      // ✅ Final validation
      if (!userId) {
        setError("User ID not found. Please login again.");
        setLoading(false);
        return;
      }

      // ✅ Fetch inductions
      await fetchInductions(userId, token);
    } catch (err) {
      console.log("LOAD INDUCTION ERROR:", err);

      setError("Failed to load data");
      setLoading(false);
    }
  };

  const fetchInductions = async (userId: string, token: string) => {
    try {
      const response = await fetch(`${BASE_URL}/get-questionnaire/${userId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      // ✅ Handle "no data" case safely
      if (
        !data.success ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        setInductions([]); // important
        return;
      }

      const formatted = data.data
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          subtitle: item.sub_heading?.[0] || "",
          status: item.status || "pending",
          questions: item.questionnaire?.length || 0,
          date: item.created_at
            ? new Date(item.created_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Recently Added",
          questionnaire: item.questionnaire,
          created_at: item.created_at,
        }));

      setInductions(formatted);
    } catch (err) {
      setError("Failed to load inductions");
      setInductions([]);
    } finally {
      setLoading(false);
    }
  };

  const capitalizeText = (text: string = "") => {
    return text
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return parts[0][0].toUpperCase() + parts[parts.length - 1][0].toUpperCase();
  };

  const handleStartInduction = (item: any) => {
    if (isCompleted(item.status)) {
      Alert.alert("Completed", "You have already passed this induction.");
      return;
    }

    const inductionTitle = capitalizeText(item.title || "Induction");

    Alert.alert(
      inductionTitle,
      `This induction contains ${item.questions} ${
        item.questions === 1 ? "question" : "questions"
      }.\n\nReady to start?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Now",
          onPress: () =>
            navigation.navigate("InductionQuestions", {
              inductionId: item.id,
            }),
        },
      ],
    );
  };
  const renderInductionItem = ({ item }: { item: any }) => {
    const done = isCompleted(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.inductionCard}
        onPress={() => handleStartInduction(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <BookOpen size={22} color={COLORS.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{capitalizeText(item.title)}</Text>

            <Text style={styles.cardDate}>{item.date}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              done ? styles.completedBadge : styles.pendingBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: done ? "#22c55e" : "#f59e0b",
                },
              ]}
            >
              {done ? "Completed" : "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.questionsBox}>
            <FileQuestion size={18} color={COLORS.primary} />

            <Text style={styles.questionsText}>
              {item.questions} {item.questions === 1 ? "Question" : "Questions"}
            </Text>
          </View>

          {/* Only show Start button for pending */}
          {!done && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleStartInduction(item)}
            >
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={THEME_COLOR} />
          <Text style={{ marginTop: 12, color: "white" }}>
            Loading inductions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const recentDone = recentInduction
    ? isCompleted(recentInduction.status)
    : false;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.newHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.greeting}>
              {capitalizeText(
                user?.name ||
                  user?.staff?.name ||
                  user?.contractor?.name ||
                  user?.customer?.name ||
                  "User",
              )}{" "}
              👋
            </Text>

            <Text style={styles.staffName}>Staff Induction Program</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarSmall}
              />
            ) : (
              <View style={styles.initialsAvatarSmall}>
                <Text style={styles.initialsTextSmall}>
                  {getInitials(
                    user?.name ||
                      user?.staff?.name ||
                      user?.contractor?.name ||
                      user?.customer?.name ||
                      "U",
                  )}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* <Text style={styles.headerSubtitle}>
          Complete your mandatory inductions to stay compliant.
        </Text> */}

        {/* Progress */}
        {/* RECENT CARD */}
        {recentInduction && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.heroCard}
            onPress={() => handleStartInduction(recentInduction)}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Award
                  size={40}
                  color={recentDone ? "#22c55e" : COLORS.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroSmall}>
                  {recentDone ? "Latest Completed" : "Recently Added"}
                </Text>

                <Text style={styles.heroTitle}>
                  {capitalizeText(recentInduction.title)}
                </Text>

                <Text style={styles.heroDate}>{recentInduction.date}</Text>
              </View>

              {recentDone && <CheckCircle size={28} color="#22c55e" />}
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>
                  {recentInduction.questions}
                </Text>

                <Text style={styles.heroStatLabel}>
                  {recentInduction.questions === 1 ? "Question" : "Questions"}
                </Text>
              </View>

              <View style={styles.heroStatBox}>
                <Text
                  style={[
                    styles.heroStatValue,
                    {
                      color: recentDone ? "#22c55e" : "#f59e0b",
                    },
                  ]}
                >
                  {recentDone ? "Done" : "Pending"}
                </Text>

                <Text style={styles.heroStatLabel}>Status</Text>
              </View>
            </View>

            {!recentDone ? (
              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => handleStartInduction(recentInduction)}
              >
                <Text style={styles.heroButtonText}>Continue Induction →</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.completedHeroBadge}>
                <CheckCircle size={18} color="#22c55e" />

                <Text style={styles.completedHeroText}>
                  Completed Successfully
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressTitle}>Overall Progress</Text>

              <Text style={styles.progressSubtitle}>
                {inductions.filter((i) => isCompleted(i.status)).length}
                {" / "}
                {inductions.length} Completed
              </Text>
            </View>

            <Text style={styles.progressPercent}>
              {inductions.length
                ? Math.round(
                    (inductions.filter((i) => isCompleted(i.status)).length /
                      inductions.length) *
                      100,
                  )
                : 0}
              %
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    inductions.length
                      ? (inductions.filter((i) => isCompleted(i.status))
                          .length /
                          inductions.length) *
                        100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View> */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error && <Text style={{ color: "red" }}>{error}</Text>}

        <Text style={styles.sectionTitle}>All Inductions</Text>
        {inductions.length === 0 && !loading && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#64748b" }}>
              No induction found
            </Text>
          </View>
        )}
        <FlatList
          data={inductions}
          renderItem={renderInductionItem}
          keyExtractor={(item, index) => `${item.id || index}`}
          scrollEnabled={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles remain the same as your original */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 25,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 12,
    paddingVertical: 14,
    // marginHorizontal: 16,
    marginTop: 10,

    borderRadius: 18,

    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#cedff0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: { flex: 1, marginLeft: 14 },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },

  staffName: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightProfile: { width: 44, height: 44, borderRadius: 22 },
  avatarSmall: { width: 44, height: 44, borderRadius: 22 },
  initialsAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#424749",
    alignItems: "center",
    justifyContent: "center",
  },
  initialsTextSmall: { color: "#fff", fontSize: 16, fontWeight: "700" },

  scrollContent: { padding: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 5,
    // marginTop: 18,
  },
  completedCardBorder: {
    borderWidth: 1,
    borderColor: "#22c55e",
  },

  recentCard: {
    borderRadius: 22,
    padding: 10,
    flexDirection: "row",

    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  recentIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,

    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,

    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  recentContent: { flex: 1 },
  recentSubtitle: { color: THEME_COLOR, fontSize: 15, fontWeight: "600" },
  recentTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginVertical: 6,
  },
  recentDate: { color: "#64748b", fontSize: 12 },
  questionsCount: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 12,

    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,

    alignSelf: "flex-start",
  },

  startButtonText: {
    color: "#001F3F",
    fontWeight: "800",
    fontSize: 14,
  },

  listCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.card,

    padding: 16,
    borderRadius: 18,

    marginBottom: 14,

    borderWidth: 1,
    borderColor: COLORS.border,
  },
  completedBorder: {
    borderWidth: 1,
    borderColor: "#22c55e",
  },

  pendingBorder: {
    borderWidth: 1.8,
    borderColor: "#ef4444",
  },

  tickTopRight: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,

    backgroundColor: "rgba(137, 231, 208, 0.08)",
    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  listContent: { flex: 1 },
  listTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  listSubtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },

  completedText: {
    color: COLORS.success,
    fontWeight: "700",
    marginLeft: 6,
  },

  pendingText: {
    color: COLORS.warning,
    fontWeight: "700",
    marginLeft: 6,
  },

  newHeader: {
    paddingHorizontal: 22,
    // paddingTop: 20,
    // paddingBottom: 28,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },

  profileImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  profilePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0A7C6E",
    justifyContent: "center",
    alignItems: "center",
  },

  profileInitials: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  welcomeText: {
    marginTop: 26,
    color: "#94A3B8",
    fontSize: 16,
  },

  userName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
  },

  headerSubtitle: {
    color: "#64748B",
    marginTop: 8,
    fontSize: 12,
    // lineHeight: 22,
  },

  progressCard: {
    marginTop: 15,
    backgroundColor: "#101827",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  progressSubtitle: {
    color: "#94A3B8",
    marginTop: 4,
  },

  progressPercent: {
    color: "#0A7C6E",
    fontWeight: "800",
    fontSize: 20,
  },

  progressTrack: {
    height: 10,
    backgroundColor: "#1E293B",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 18,
  },

  progressFill: {
    height: 10,
    backgroundColor: "#0A7C6E",
    borderRadius: 20,
  },
  heroCard: {
    backgroundColor: "#101827",
    borderRadius: 28,
    padding: 10,
    // marginBottom: 26,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",

    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "rgba(0,169,157,0.12)",

    marginRight: 18,
  },

  heroSmall: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  heroTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },

  heroDate: {
    color: "#94A3B8",
    marginTop: 2,
    fontSize: 12,
  },

  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 7,
  },

  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  heroStatBox: {
    alignItems: "center",
    flex: 1,
  },

  heroStatValue: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "800",
  },

  heroStatLabel: {
    marginTop: 2,
    color: "#94A3B8",
  },

  heroButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,

    paddingVertical: 12,

    alignItems: "center",

    marginTop: 15,
  },

  heroButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  completedHeroBadge: {
    marginTop: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(34,197,94,.12)",

    borderRadius: 18,

    paddingVertical: 14,
  },

  completedHeroText: {
    color: "#22c55e",
    fontWeight: "700",
    marginLeft: 8,
  },
  inductionCard: {
    backgroundColor: "#101827",
    borderRadius: 22,
    padding: 15,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: "#535353",

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(0,169,157,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },

  cardDate: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 10,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  completedBadge: {
    backgroundColor: "rgba(34,197,94,.15)",
  },

  pendingBadge: {
    backgroundColor: "rgba(245,158,11,.15)",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,.06)",
    marginVertical: 10,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  questionsBox: {
    flexDirection: "row",
    alignItems: "center",
  },

  questionsText: {
    marginLeft: 8,
    color: "#CBD5E1",
    fontSize: 12,
  },

  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },

  reviewButton: {
    backgroundColor: "#22c55e",
  },

  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
