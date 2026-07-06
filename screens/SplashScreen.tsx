import React from "react";
import { View, Image, StyleSheet, StatusBar } from "react-native";

const LOGO = require("../assets/staffoo.png");

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f0f2f5" barStyle="dark-content" />
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
  logo: {
    width: 260,
    height: 260,
  },
});
