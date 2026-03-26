// AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SplashScreen from '../screens/SplashScreen';
import MainDrawer from '../screens/MainDrawer';
import FilterScreen from '../screens/FilterScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import AllJobsScreen from '../screens/AllJobsScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ViewApplicationScreen from '../screens/ViewApplicationScreen';
import MessageScreen from '../screens/MessageScreen';
import MessageDetailScreen from '../screens/MessageDetailScreen';
import ApplyJobScreen from '../screens/ApplyJobScreen';
import SuccessScreen from '../screens/SuccessScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import AccountsScreen from '../screens/AccountsScreen';
// import ChargeRatesScreen from '../screens/ChargeRatesScreen';
// import PayRatesScreen from '../screens/PayRatesScreen';
import CreateJobScreen from '../screens/CreateJobScreen';
import ReviewConfirmScreen from '../screens/ReviewConfirmScreen';
import StaffShifts from '../screens/StaffShifts';
import SignInDetails from '../screens/SignInDetails';
import OngoingShift from '../screens/OngoingShift';
import CreateIncidentReport from '../screens/CreateIncidentReport';
import CreateFootPatrol from '../screens/CreateFootPatrol';
import AsapJobDetails from '../screens/AsapJobDetails';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';


// ─── Define route params ────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;

  Filter: undefined;
  ProfileSetup: undefined;
  Notifications: undefined;

  JobDetails: { jobId?: string };
  AllJobs: undefined;
  Applications: undefined;
  ViewApplications: undefined;
  Messages: undefined;
  MessageDetail: undefined;
  Profile: undefined;
  ApplyJob: undefined;
  Documents: undefined;
  Accounts: undefined;
  ChargeRates: undefined;
  PayRates: undefined;
  CreateJob: undefined;
  ReviewConfirm: {
    jobData: {
      category: string;
      guardsCount: number;
      location: string;
      lat: number;
      lng: number;
      description: string;
      startDate: Date;
      startTime: Date;
      endDate: Date;
      endTime: Date;
    };
    uploadedFilesCount: number;
    selectedDocuments?: string[];
    uploadedFileUrls?: string[];
  };
  Success: undefined;
  StaffShifts: undefined;
  SignIn: undefined;
  Ongoing: undefined;
  CreateIncidentReport: undefined;
  CreateFootReport: undefined;
  AsapJobDetails:undefined;
  BreakForm:undefined;
  PaymentHistory:undefined;
  PaymentMethod:undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const [hasSeenOnboarding, authToken, userStr] = await Promise.all([
          AsyncStorage.getItem('hasSeenOnboarding'),
          AsyncStorage.getItem('@auth_token'),
          AsyncStorage.getItem('@user'),
        ]);

        console.log('[BOOTSTRAP] hasSeenOnboarding:', hasSeenOnboarding);
        console.log('[BOOTSTRAP] authToken exists:', !!authToken);
        console.log('[BOOTSTRAP] user exists:', !!userStr);

        if (authToken) {
          console.log('User is logged in → going to Main');
          setInitialRoute('Profile');
        } else if (hasSeenOnboarding === 'true') {
          console.log('Seen onboarding → going to Login');
          setInitialRoute('Login');
        } else {
          console.log('First time → going to Onboarding');
          setInitialRoute('Onboarding');
        }
      } catch (e) {
        console.error('[BOOTSTRAP ERROR]', e);
        setInitialRoute('Onboarding');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  if (isLoading || !initialRoute) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName={'Profile'}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

      <Stack.Screen name="Filter" component={FilterScreen} />

      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />

      <Stack.Screen name="JobDetails" component={JobDetailScreen} />
      <Stack.Screen name="AllJobs" component={AllJobsScreen} />
      <Stack.Screen name="Applications" component={ApplicationsScreen} />
      <Stack.Screen name="ViewApplications" component={ViewApplicationScreen} />
      <Stack.Screen name="Messages" component={MessageScreen} />
      <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ApplyJob" component={ApplyJobScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      {/* <Stack.Screen name="ChargeRates" component={ChargeRatesScreen} /> */}
      {/* <Stack.Screen name="PayRates" component={PayRatesScreen} /> */}
      <Stack.Screen name="CreateJob" component={CreateJobScreen} />
      <Stack.Screen name="ReviewConfirm" component={ReviewConfirmScreen} />
      <Stack.Screen name="StaffShifts" component={StaffShifts} />
      <Stack.Screen name="SignIn" component={SignInDetails} />
      <Stack.Screen name="Ongoing" component={OngoingShift} />
      <Stack.Screen name="CreateIncidentReport" component={CreateIncidentReport} />
      <Stack.Screen name="CreateFootReport" component={CreateFootPatrol} />
       <Stack.Screen name="AsapJobDetails" component={AsapJobDetails} />
<Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
<Stack.Screen name="PaymentMethod" component={PaymentMethodsScreen} />
      {/* <Stack.Screen name="Success" component={SuccessScreen} /> */}

      <Stack.Screen
        name="Main"
        component={MainDrawer}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}