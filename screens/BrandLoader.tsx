
import React, { useEffect } from "react";
import { View, StyleSheet, useWindowDimensions, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

// Exact colors sampled from the Staffoo logo.
const TEAL = "#0A7C6E";
const LIME = "#A4BC50";

const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

type Props = {
  size?: number;
  fullScreen?: boolean;
  backgroundColor?: string;
  style?: ViewStyle;
};

export default function BrandLoader({
  size,
  fullScreen = false,
  backgroundColor = "transparent",
  style,
}: Props) {
  const { width, height } = useWindowDimensions();
  const resolvedSize =
    size ?? Math.max(72, Math.min(160, Math.min(width, height) * 0.32));
  const outerRotation = useSharedValue(0);
  const arcRotation = useSharedValue(0);
  const dotPulse = useSharedValue(0);

  useEffect(() => {
    outerRotation.value = withRepeat(
      withTiming(360, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
    arcRotation.value = withRepeat(
      withTiming(-360, { duration: 1600, easing: Easing.linear }),
      -1,
      false,
    );
    dotPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, []);

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${outerRotation.value}deg` }],
  }));

  const arcStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arcRotation.value}deg` }],
  }));

  const bigDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + dotPulse.value * 0.18 }],
  }));

  const smallDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - dotPulse.value * 0.18 }],
  }));

  const outerR = 42;
  const outerStroke = 8;
  const outerCircumference = 2 * Math.PI * outerR;
  const outerDash = outerCircumference * (294 / 360);
  const arcR = 30;
  const arcStroke = 7;
  const arcCircumference = 2 * Math.PI * arcR;
  const arcDash = arcCircumference * (85 / 360);
  const bigDotSize = resolvedSize * 0.14;
  const smallDotSize = resolvedSize * 0.09;

  const mark = (
    <View style={{ width: resolvedSize, height: resolvedSize }}>
      <Animated.View
        style={[StyleSheet.absoluteFill, outerRingStyle]}
        pointerEvents="none"
      >
        <Svg width={resolvedSize} height={resolvedSize} viewBox="0 0 100 100">
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={outerR}
            stroke={TEAL}
            strokeWidth={outerStroke}
            strokeLinecap="round"
            strokeDasharray={`${outerDash} ${outerCircumference}`}
            fill="none"
          />
        </Svg>
      </Animated.View>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={resolvedSize} height={resolvedSize} viewBox="0 0 100 100">
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={arcR}
            stroke={TEAL}
            strokeOpacity={0.16}
            strokeWidth={4}
            fill="none"
          />
        </Svg>
      </View>

      <Animated.View
        style={[StyleSheet.absoluteFill, arcStyle]}
        pointerEvents="none"
      >
        <Svg width={resolvedSize} height={resolvedSize} viewBox="0 0 100 100">
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={arcR}
            stroke={LIME}
            strokeWidth={arcStroke}
            strokeLinecap="round"
            strokeDasharray={`${arcDash} ${arcCircumference}`}
            fill="none"
          />
        </Svg>
      </Animated.View>

  
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View
          style={[
            styles.dotWrap,
            bigDotStyle,
            {
              width: bigDotSize,
              height: bigDotSize,
              left: resolvedSize * 0.34 - bigDotSize / 2,
              top: resolvedSize * 0.5 - bigDotSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              { width: bigDotSize, height: bigDotSize, backgroundColor: TEAL },
            ]}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.dotWrap,
            smallDotStyle,
            {
              width: smallDotSize,
              height: smallDotSize,
              left: resolvedSize * 0.46 - smallDotSize / 2,
              top: resolvedSize * 0.4 - smallDotSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              {
                width: smallDotSize,
                height: smallDotSize,
                backgroundColor: LIME,
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );

  if (!fullScreen) {
    return <View style={style}>{mark}</View>;
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor }, style]}>{mark}</View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dotWrap: {
    position: "absolute",
  },
  dot: {
    borderRadius: 999,
  },
});
