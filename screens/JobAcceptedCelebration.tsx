import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { CheckCircle } from "lucide-react-native";

const { width, height } = Dimensions.get("window");
const CONFETTI_COLORS = [
  "#00A99D",
  "#34C88A",
  "#F5A623",
  "#F87171",
  "#6590D9",
  "#A78BFA",
];
const CONFETTI_COUNT = 26;

type Props = {
  visible: boolean;
  onDone: () => void;
  message?: string;
  subtitle?: string;
};

// Full-screen celebration shown right after a job is successfully accepted.
// Auto-hides itself after ~2.2s and calls onDone — the parent screen's own
// navigation/refresh logic keeps running underneath in the meantime, so
// this just covers the transition with something satisfying to look at.
export default function JobAcceptedCelebration({
  visible,
  onDone,
  message = "Job Accepted!",
  subtitle = "Nice work — check it in Accepted Jobs",
}: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const confetti = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      translateY: new Animated.Value(-40),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      left: Math.random() * width,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      duration: 1600 + Math.random() * 900,
      spin: 360 + Math.random() * 360,
    })),
  ).current;

  useEffect(() => {
    if (!visible) return;

    scale.setValue(0);
    opacity.setValue(0);
    confetti.forEach((c) => {
      c.translateY.setValue(-40);
      c.opacity.setValue(1);
      c.rotate.setValue(0);
    });

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      ...confetti.map((c) =>
        Animated.parallel([
          Animated.timing(c.translateY, {
            toValue: height + 40,
            duration: c.duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(c.rotate, {
            toValue: 1,
            duration: c.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(1100),
            Animated.timing(c.opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onDone());
    }, 2200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      {confetti.map((c, i) => {
        const rotateInterpolate = c.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${c.spin}deg`],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.confettiPiece,
              {
                left: c.left,
                backgroundColor: c.color,
                opacity: c.opacity,
                transform: [
                  { translateY: c.translateY },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          />
        );
      })}

      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={styles.iconWrap}>
          <CheckCircle size={64} color="#34C88A" strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>{message}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,5,8,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 999,
  },
  confettiPiece: {
    position: "absolute",
    top: -20,
    width: 8,
    height: 14,
    borderRadius: 2,
  },
  card: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(52,200,138,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(52,200,138,0.4)",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
