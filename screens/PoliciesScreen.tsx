import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import Pdf from 'react-native-pdf';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

export default function PoliciesScreen() {
  const navigation = useNavigation();

  // Use bundle-assets for Android, require for iOS
  const source = Platform.OS === 'android'
    ? { uri: 'bundle-assets://policies.pdf' }
    : require('../assets/policies.pdf');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.title}>Privacy Policy</Text>
        </View>
      </View>

      {/* PDF */}
      <Pdf
        source={source}
        style={styles.pdf}
        trustAllCerts={false} // Add this for Android compatibility
        onError={(error) => {
          console.log("PDF Loading Error:", error);
        }}
      />
    </View>
  );
}

// ... your existing styles remain exactly the same

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  pdf: {
    flex: 1,
    width: '100%',
  },
});