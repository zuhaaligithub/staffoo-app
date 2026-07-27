import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ViewToken,
  Animated,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    image: require("../assets/boarding1.png"),
    title: "Search job easier\nand more effective",
    desc: "Make your experience of searching job\nmore easier and more effective",
  },
  {
    image: require("../assets/boarding2.png"),
    title: "Apply for job\nanywhere & anytime",
    desc: "Jobfil makes you can apply for job from\nanywhere and anytime",
  },
  {
    image: require("../assets/boarding3.png"),
    title: "Help find the right job\nwith your desire",
    desc: "Jobfil can help you find the right\njob with your desire",
  },
];

const COLORS = {
  brand: "#89E7D0",
  brandDark: "#001F3F",
  brandLight: "#021d37",
  background: "#030508",
  surface: "#0B2A4A",
  text: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.75)",
  textMuted: "rgba(255,255,255,0.55)",
};

type Props = { navigation: any };

export default function OnboardingScreen({ navigation }: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleGetStarted = () => {
    navigation.navigate("Login");
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = ({
    item,
    index,
  }: {
    item: (typeof slides)[0];
    index: number;
  }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [60, 0, -60],
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
    });

    return (
      <View style={styles.slide}>
        <Animated.View
          style={[
            styles.imageContainer,
            { transform: [{ translateX }, { scale }] },
          ]}
        >
          <LinearGradient
            colors={["rgba(137,231,208,0.15)", "rgba(137,231,208,0.05)"]}
            style={styles.imageGradient}
          >
            <Image
              source={item.image}
              style={styles.boardingImg}
              resizeMode="contain"
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View
          style={{
            alignItems: "center",
            transform: [{ translateX }],
            opacity,
            paddingHorizontal: 20,
          }}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.desc}>{item.desc}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 28, 8],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: COLORS.brand,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.brand, "#4FCBB3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  slide: {
    width,
    flex: 1,
    // justifyContent: 'center',
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 50,
  },

  imageContainer: {
    width: width * 0.75,
    height: height * 0.32,
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: 40,
    borderWidth: 2,
    borderColor: "rgba(137,231,208,0.3)",
  },

  imageGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  boardingImg: {
    width: "92%",
    height: "92%",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 16,
  },

  desc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },

  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    position: "absolute",
    bottom: 180,
    width: "100%",
  },

  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 6,
  },

  buttonContainer: {
    position: "absolute",
    bottom: 60,
    left: 24,
    right: 24,
  },

  getStartedButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },

  gradientButton: {
    height: 58,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
