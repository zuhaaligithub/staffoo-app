import React, { useRef, useState } from 'react';
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
} from 'react-native';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    image: require('../assets/boarding1.png'),
    title: 'Search Job Easier\nand More Effective',
    desc: 'Make your experience of searching job\nmore easier and more effective',
  },
  {
    image: require('../assets/boarding2.png'),
    title: 'Apply for job\nanywhere & anytime',
    desc: 'Jobfil makes you can apply for job from\nanywhere and anytime',
  },
  {
    image: require('../assets/boarding3.png'),
    title: 'Help Find the Right Job\nWith Your Desire',
    desc: 'Jobfil can help you find the right\njob with your desire',
  },
];

type Props = {
  navigation: any;
};

export default function OnboardingScreen({ navigation }: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = ({
    item,
    index,
  }: {
    item: typeof slides[0];
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
          <Image
            source={item.image}
            style={styles.boardingImg}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={{
            alignItems: 'center',
            transform: [{ translateX }],
            opacity,
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
          { useNativeDriver: false }
        )}
      />

      {/* Pagination */}
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff',paddingTop:40 },

  slide: {
    width,
    flex: 1,
    // alignItems: 'center',
    // justifyContent: 'center',
    paddingHorizontal: 24,
  },

  imageContainer: {
    // flex: 0.4,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 20,
    borderColor: '#0A7C6E',
  },

  boardingImg: {
    width: width * 0.98,
    height: height * 0.38,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
    marginTop: 30,
  },

  desc: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 25,
    paddingHorizontal: 12,
  },

  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 200,
    width: '100%',
  },

  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A7C6E',
    marginHorizontal: 6,
  },

  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
  },

  getStartedButton: {
    backgroundColor: '#0A7C6E',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});