import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { Bell, Home, User, Shield, Mail, Handshake } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 148,
  strokeWidth = 7,
  color = '#89E7D0',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(137, 231, 208, 0.15)"
          strokeWidth={strokeWidth}
          fill="rgba(10, 22, 37, 0.65)"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.circleContent}>{children}</View>
    </Animated.View>
  );
};

// Animated FAB Component
const AnimatedFAB = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.fab}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.fabGlow,
          {
            opacity: glowOpacity,
          },
        ]}
      />
      {/* Main FAB */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity>
          <View style={styles.fabInner}>
           <Handshake size={28} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function StaffooScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background with blurred circles */}
      {/* <View style={styles.background}>
        <View style={[styles.blurCircle, styles.blurCircle1]} />
        <View style={[styles.blurCircle, styles.blurCircle2]} />
        <View style={[styles.blurCircle, styles.blurCircle3]} />
      </View> */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.mainCard}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.staffooText}>Staffoo</Text>
            <TouchableOpacity style={styles.bellButton}>
              <Bell size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.41)',
               
              // 'rgba(255,255,255,0.35)',
              'rgba(255,255,255,0.35)',
              
                'rgba(255, 255, 255, 0.2)',
              'rgba(255,255,255,0.10)',
              'rgba(255, 255, 255, 0.22)',
              
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shiftCard}
          >
            <Text style={styles.shiftLabel}>NEXT IMPENDING SHIFT</Text>
            <Text style={styles.siteName}>
              Site: Tanglewood Blvd, Truganina
            </Text>
            <Text style={styles.countdown}>02:15:30</Text>
            <Text style={styles.liveText}>Live countdown</Text>
          </LinearGradient>
          {/* Progress Rings */}
          <View style={styles.progressRow}>
            {/* Student Visa Progress */}
            <View style={styles.progressCircleContainer}>
              <ProgressRing progress={75} color="#89E7D0">
                <Text style={styles.progressTopTitle}>Student Visa</Text>
                <Text style={styles.progressTopSubtitle}>(Casual Cap)</Text>
                <View style={styles.hoursRow}>
                  <Text style={styles.circleBigText}>18</Text>
                  <Text style={styles.circleSmallText}>/24</Text>
                </View>
                <Text style={styles.circleLabel}>Hours</Text>
              </ProgressRing>
            </View>

            {/* Weekly Shifts Progress */}
            <View style={styles.progressCircleContainer}>
              <ProgressRing progress={80} color="#89E7D0">
                <Text style={styles.progressTopTitle}>WEEKLY SHIFTS</Text>
                <View style={styles.hoursRow}>
                  <Text style={[styles.circleBigText, { color: '#89E7D0' }]}>
                    4
                  </Text>
                  <Text style={[styles.circleSmallText, { color: '#89E7D0' }]}>
                    /5
                  </Text>
                </View>
                <Text style={styles.circleLabel}>accepted</Text>
              </ProgressRing>
            </View>
          </View>

          {/* Today's Shifts */}
          <View style={styles.shiftsSection}>
            <View style={styles.shiftsHeader}>
              <Text style={styles.sectionTitle}>Today's Shifts</Text>
              <TouchableOpacity>
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>



            <View style={styles.shiftsGrid}>
              {[1, 2, 3].map((_, i) => (

                
               <LinearGradient
  key={i}
  colors={[
              'rgba(255, 255, 255, 0.41)',
               
              // 'rgba(255,255,255,0.35)',
              'rgba(255,255,255,0.35)',
              
                'rgba(255, 255, 255, 0.2)',
              'rgba(255,255,255,0.10)',
              'rgba(255, 255, 255, 0.22)',
              
            ]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.shiftCardSmall}
>
  <Text style={styles.shiftTime}>14:00 - 22:00</Text>
  <Text style={styles.shiftRole}>Event Security</Text>
</LinearGradient>
              ))}
            </View>
          </View>

          {/* Animated FAB */}
          <AnimatedFAB />
        </View>

        {/* Bottom spacing for navigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Home size={24} color="#fff" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
          <View style={styles.activeIndicator} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <User size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Profile/Compliance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Shield size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Patrol</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Mail size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Inbox</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },

  // Background blur circles
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blurCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  blurCircle1: {
    top: -100,
    left: -80,
    backgroundColor: '#89E7D0',
    opacity: 0.09,
  },
  blurCircle2: {
    top: 150,
    right: -90,
    backgroundColor: '#0047FF',
    opacity: 0.07,
  },
  blurCircle3: {
    bottom: 120,
    left: -70,
    backgroundColor: '#89E7D0',
    opacity: 0.06,
  },

  scrollView: {
    flex: 1,
  },

  // Main card - Deep Navy
  mainCard: {
    backgroundColor: '#001F3F',
    // marginHorizontal: 16,
    // marginTop: 20,
    // marginBottom: 40,
    // borderRadius: 24,
    padding: 20,
    // paddingBottom: 60,
    // borderWidth: 1,
    borderColor: 'rgba(137, 231, 208, 0.18)',
    shadowColor: '#000',
    // shadowOffset: { width: 0, height: 15 },
    // shadowOpacity: 0.5,
    // shadowRadius: 25,
    // elevation: 20,
  },

  // Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  staffooText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bellButton: {
    padding: 4,
  },

shiftCard: {
  width: '100%',
  height:'26%',
  borderRadius: 20,
  borderWidth:1,
  borderColor:'#021d37',
  // paddingVertical: 18,
  // paddingHorizontal: 14,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,
},


shiftCardSmall: {
  width: '50%',
  height: 65,
  borderRadius: 14,
  // paddingVertical: 10,
  paddingHorizontal: 5,
  marginBottom: 10,
  borderWidth:1,
  borderColor:'#021d37',
  alignItems: 'center',
  justifyContent: 'center',
},
  shiftLabel: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: 8,
  },
  siteName: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '400',
  },
  countdown: {
    fontSize: 52,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 2,
    marginVertical: 0,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // Progress Rings
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    marginTop: 8,
  },
  progressCircleContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  circleContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressTopTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: 15,
  },
  progressTopSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginVertical: 4,
  },
  circleBigText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#89E7D0',
  },
  circleSmallText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#89E7D0',
    marginLeft: 3,
    marginBottom: 4,
  },
  circleLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 0,
  },

  // Today's Shifts Section
  shiftsSection: {
    marginTop: 14,
  },
  shiftsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    marginLeft:8
  },
  viewAll: {
    color: '#0047FF',
    fontSize: 14,
    fontWeight: '600',
    marginRight:20
  },
  shiftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  shiftTime: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  shiftRole: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },

  // Animated FAB
  fab: {
    position: 'absolute',
    bottom: -10,
    right: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0047FF',
    opacity: 0.4,
  },
  fabInner: {
    width: 62,
    height: 62,
    backgroundColor: '#0047FF',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    // borderWidth: 5,
    // borderColor: '#fff',
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  fabIcon: {
    fontSize: 32,
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    backgroundColor: '#001F3F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flex: 1,
  },
  navLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -16,
    width: 40,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});
