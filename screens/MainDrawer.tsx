// // MainDrawer.tsx
// import React from 'react';
// import { createDrawerNavigator } from '@react-navigation/drawer';
// import { useWindowDimensions } from 'react-native';

// import HomeScreen from '../screens/HomeScreen';
// // import SidebarMenu from '../screens/SidebarMenu';

// const Drawer = createDrawerNavigator();

// export default function MainDrawer() {
//   const dimensions = useWindowDimensions();

//   return (
//     <Drawer.Navigator
//       // drawerContent={(props) => <SidebarMenu {...props} />}
//       screenOptions={{
//         drawerStyle: {
//           width: dimensions.width * 0.78,
//           backgroundColor: '#ffffff',
//         },
//         drawerType: 'front',                // overlay style (most apps use this)
//         overlayColor: 'rgba(0,0,0,0.5)',    // nice dimming
//         headerShown: false,
//         swipeEnabled: true,
//         swipeEdgeWidth: 60,                 // easier to swipe open
        
//       }}
//     >
//       <Drawer.Screen 
//         name="Home" 
//         component={HomeScreen}
//         options={{ title: 'Home' }}       
//       />
  
//     </Drawer.Navigator>
//   );
// }