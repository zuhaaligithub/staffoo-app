import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import Pdf from "react-native-pdf";
import { X } from "lucide-react-native";

export default function PdfViewerModal({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);

  const openExternally = async (u?: string) => {
    if (!u) return;
    try {
      const ok = await Linking.openURL(u);
      return ok;
    } catch (e) {
      // try file:// prefix for local files
      try {
        const fileUri = u.startsWith("file://") ? u : `file://${u}`;
        await Linking.openURL(fileUri);
      } catch (err) {
        Alert.alert(
          "Unable to open file",
          "No application available to open this PDF.",
        );
      }
    }
  };

  // Normalize URI for Pdf component
  let src = uri || "";
  if (src && !src.startsWith("http") && !src.startsWith("file://")) {
    // assume local path needs file://
    src =
      Platform.OS === "android" || src.startsWith("/") ? `file://${src}` : src;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Document Preview</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading && (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        <Pdf
          source={{ uri: src, cache: true }}
          style={styles.pdf}
          onLoadComplete={() => setLoading(false)}
          onError={async (error) => {
            console.log("PDF Error:", error);
            // fallback: try to open with external app/browser
            await openExternally(uri);
            // close modal after attempting external open
            onClose();
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B132B" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  closeButton: { padding: 5 },
  pdf: { flex: 1, width: "100%" },
});
