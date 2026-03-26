// screens/SplashScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';

const LOGO = require('../assets/staffo.png');

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator size="large" color="#6085c6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
});