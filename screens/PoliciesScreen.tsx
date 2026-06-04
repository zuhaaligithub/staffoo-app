import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import Pdf from 'react-native-pdf';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

export default function PoliciesScreen() {
  const navigation = useNavigation();

  const source = require('../assets/policies.pdf');
  const logo = require('../assets/staffoo.png');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color="#000" />
        </TouchableOpacity>

        {/* Center Content */}
        <View style={styles.center}>
          <Text style={styles.title}>Privacy Policy</Text>
          {/* <Image source={logo} style={styles.logo} /> */}
        </View>
      </View>

      {/* PDF */}
      <Pdf source={source} style={styles.pdf} />
    </View>
  );
}

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
    gap: 10, // works in newer RN versions; fallback is margin
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },

  pdf: {
    flex: 1,
    width: '100%',
  },
});
