// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Switch,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import {
//   DrawerContentComponentProps,
//   DrawerContentScrollView,
// } from '@react-navigation/drawer';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// // Lucide icons
// import {
//   Home,
//   FileText,
//   MessageCircle,
//   User,
//   School,
//   Briefcase,
//   GraduationCap,
//   Award,
//   LayoutDashboard,
//   Puzzle,
//   LogOut,
//   Moon,
//   Sun,
// } from 'lucide-react-native';

// interface MenuItem {
//   title: string;
//   icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
//   screen: string;
//   isActive?: boolean;
// }

// export default function SidebarMenu(props: DrawerContentComponentProps) {
//   const { navigation } = props;

//   const [darkMode, setDarkMode] = useState(false);
//   const [rtlMode, setRtlMode] = useState(false);

//   // Load saved dark mode preference on mount
//   useEffect(() => {
//     const loadTheme = async () => {
//       try {
//         const savedDarkMode = await AsyncStorage.getItem('darkMode');
//         if (savedDarkMode !== null) {
//           setDarkMode(JSON.parse(savedDarkMode));
//         }
//       } catch (e) {
//         console.log('Failed to load dark mode preference', e);
//       }
//     };
//     loadTheme();
//   }, []);


//   const menuItems: MenuItem[] = [
//     { title: 'Home', icon: Home, screen: 'Home', isActive: true },
//     { title: 'Profile', icon: User, screen: 'Profile' },
//     { title: 'Pages', icon: LayoutDashboard, screen: 'Pages' },
//     { title: 'Components', icon: Puzzle, screen: 'Components' },
//   ];

//   const theme = {
//     background: darkMode ? '#111827' : '#f8fafc',
//     card: darkMode ? '#1f2937' : '#ffffff',
//     textPrimary: darkMode ? '#f3f4f6' : '#0f172a',
//     textSecondary: darkMode ? '#9ca3af' : '#64748b',
//     border: darkMode ? '#374151' : '#e2e8f0',
//     accent: '#3b82f6',
//     gradientStart: darkMode ? '#4f46e5' : '#7c66ff',
//     gradientEnd: darkMode ? '#7c3aed' : '#a55fff',
//     inactiveIcon: darkMode ? '#9ca3af' : '#6b7280',
//     activeBg: darkMode ? '#374151' : '#f0f4ff',
//     logout: '#ef4444',
//   };
//   const handleSectionPress = () => {

//     navigation.reset({
//       index: 0,
//       routes: [{ name: 'Login' }],
//     });
//     return;
//   }



//   return (
//     <DrawerContentScrollView
//       {...props}
//       contentContainerStyle={{ flexGrow: 1, padding: 0 }}
//       style={{ backgroundColor: theme.background }}
//     >
//       <LinearGradient
//         colors={[theme.gradientStart, theme.gradientEnd]}
//         style={styles.headerGradient}
//       >
//         <View style={styles.logoRow}>
//           <Image
//             source={require('../assets/logo-1.png')}
//             style={styles.logo}
//             resizeMode="contain"
//           />
//           <Text style={[styles.appName, { color: '#ffffff' }]}>
//             Staffo - Job Finder Mobile App
//           </Text>
//         </View>
//       </LinearGradient>

//       <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
//         <View style={[styles.userSection, { borderBottomColor: theme.border }]}>
//           <Image source={require('../assets/avt-1.jpg')} style={styles.userAvatar} />
//           <View style={styles.userInfo}>
//             <Text style={[styles.greeting, { color: theme.textSecondary }]}>
//               Good morning
//             </Text>
//             <Text style={[styles.userName, { color: theme.textPrimary }]}>
//               Hello! Smith
//             </Text>
//           </View>
//         </View>

//         <View style={styles.menuSection}>
//           <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
//             MAIN MENU
//           </Text>

//           {menuItems.map((item) => {
//             const isActive = item.isActive ?? false;
//             const Icon = item.icon;

//             return (
//               <TouchableOpacity
//                 key={item.title}
//                 style={[
//                   styles.menuItem,
//                   isActive && [styles.menuItemActive, { backgroundColor: theme.activeBg }],
//                 ]}
//                 onPress={() => navigation.navigate(item.screen)}
//               >
//                 <View style={styles.iconWrapper}>
//                   <Icon
//                     size={24}
//                     color={isActive ? theme.accent : theme.inactiveIcon}
//                     strokeWidth={2}
//                   />
//                 </View>

//                 <Text
//                   style={[
//                     styles.menuText,
//                     { color: isActive ? theme.accent : theme.textPrimary },
//                     isActive && { fontWeight: '600' },
//                   ]}
//                 >
//                   {item.title}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}
//         </View>


//       </View>
//       <TouchableOpacity style={styles.logoutRow}>
//         <LogOut size={24} color={theme.logout} strokeWidth={2} />
//         <Text style={[styles.logoutText, { color: theme.logout }]} onPress={() => handleSectionPress()}>
//           Logout
//         </Text>
//       </TouchableOpacity>
//     </DrawerContentScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   headerGradient: {
//     paddingTop: 40,
//     paddingBottom: 24,
//     paddingHorizontal: 16,
//   },
//   logoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   logo: {
//     width: 52,
//     height: 52,
//     marginRight: 12,
//   },
//   appName: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   contentContainer: {
//     flex: 1,
//     paddingHorizontal: 0,
//   },
//   userSection: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 20,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//   },
//   userAvatar: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//   },
//   userInfo: {
//     marginLeft: 16,
//   },
//   greeting: {
//     fontSize: 13,
//   },
//   userName: {
//     fontSize: 17,
//     fontWeight: '700',
//   },
//   menuSection: {
//     paddingVertical: 16,
//   },
//   sectionLabel: {
//     fontSize: 12,
//     fontWeight: '700',
//     marginBottom: 8,
//     paddingHorizontal: 16,
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//   },
//   menuItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderRadius: 12,
//     marginHorizontal: 8,
//     marginVertical: 4,
//   },
//   menuItemActive: {
//     backgroundColor: '#f0f4ff',
//   },
//   iconWrapper: {
//     marginRight: 16,
//     width: 24,
//     alignItems: 'center',
//   },
//   menuText: {
//     fontSize: 16,
//   },
//   settingsSection: {
//     paddingTop: 12,
//     paddingBottom: 40,
//   },
//   settingRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//   },
//   settingText: {
//     fontSize: 16,
//   },
//   logoutRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     marginTop: 8,
//   },
//   logoutText: {
//     fontSize: 16,
//     marginLeft: 16,
//     fontWeight: '500',
//   },
// });