// AppNavigator.tsx
import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";


import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import SplashScreen from "../screens/SplashScreen";

import ProfileSetupScreen from "../screens/ProfileSetupScreen";

import MessageDetailScreen from "../screens/MessageDetailScreen";

import SuccessScreen from "../screens/SuccessScreen";
import DocumentsScreen from "../screens/DocumentsScreen";
import AccountsScreen from "../screens/AccountsScreen";
import CreateJobScreen from "../screens/CreateJobScreen";
import ReviewConfirmScreen from "../screens/ReviewConfirmScreen";
import SignInDetails from "../screens/SignInDetails";
import OngoingShift from "../screens/OngoingShift";
import CreateIncidentReport from "../screens/CreateIncidentReport";
import CreateFootPatrol from "../screens/CreateFootPatrol";
import AsapJobDetails from "../screens/AsapJobDetails";
import PaymentHistoryScreen from "../screens/PaymentHistoryScreen";
import PaymentMethodsScreen from "../screens/PaymentMethodsScreen";
import LeaveManagementScreen from "../screens/LeaveManagementScreen";
import PayslipScreen from "../screens/PayslipScreen";
import JobPaymentHistory from "../screens/JobPaymentHistory";
import StaffInduction from "../screens/StaffInduction";
import InductionQuestionsScreen from "../screens/InductionQuestionScreen";
import StaffFormsScreen from "../screens/StaffFormsScreen";
import TestScreen from "../screens/TestScreen";
import StaffManagement from "../screens/StaffManagement";
import PoliciesScreen from "../screens/PoliciesScreen";
import DeleteProfileVerification from "../screens/DeleteProfileVerification";
import CoverJobsScreen from "../screens/CoverJobsScreen";

// ── MainTabs: the persistent bottom-tab layout ──────────────────────────────
import MainTabs from "../screens/MainTabs";
import TimesheetScreen from "../screens/Timesheetscreen";
import ContractorRatesScreen from "../screens/ContractorRatesScreen";
import SupportScreen from "../screens/SupportScreen";

// ─── Route param types ───────────────────────────────────────────────────────
export type RootStackParamList = {

  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  MainTabs: { screen?: string } | undefined;

  // Stack screens pushed on top of tabs
  Policies: undefined;
  Support: undefined;
  Filter: undefined;
  ProfileSetup: undefined;
  LeaveManagement: undefined;
  Notifications: undefined;
  JobDetails: { jobId?: string };
  AllJobs: undefined;
  ViewApplications: undefined;
  MessageDetail: undefined;
  ApplyJob: undefined;
  Documents: undefined;
  Payslip: undefined;
  Test: undefined;
  Accounts: undefined;
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
  DeleteProfileVerification: undefined;
  Success: undefined;
  StaffManagement: undefined;
  SignIn: undefined;
  Ongoing: undefined;
  CreateIncidentReport: undefined;
  CreateFootReport: undefined;
  AsapJobDetails: undefined;
  PaymentHistory: undefined;
  PaymentMethod: undefined;
  JobPayment: undefined;
  Induction: undefined;
  StaffForms: undefined;
  InductionQuestions: undefined;
  CoverJobs: undefined;
  CreateJob: undefined;
  Timesheet: undefined;
  ContractorRates: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<
    keyof RootStackParamList | null
  >(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const authToken = await AsyncStorage.getItem("@auth_token");

        if (authToken) {
          // Authenticated → go straight into the tabbed layout
          setInitialRoute("MainTabs");
        } else {
          // Not authenticated → go straight to Login
          setInitialRoute("Login");
        }
      } catch (e) {
        console.error("[BOOTSTRAP ERROR]", e);
        setInitialRoute("Login");
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
      initialRouteName={initialRoute!}
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
   
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

      {/* ✅ Tabbed layout — bottom bar lives here permanently */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ animation: "none" }} // no slide animation into tabs
      />

      {/* ── Stack screens pushed on top of tabs ── */}
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} />
      <Stack.Screen name="Timesheet" component={TimesheetScreen} />
      <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Payslip" component={PayslipScreen} />
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      <Stack.Screen name="CreateJob" component={CreateJobScreen} />
      <Stack.Screen name="ReviewConfirm" component={ReviewConfirmScreen} />
      <Stack.Screen name="SignIn" component={SignInDetails} />
      <Stack.Screen name="Ongoing" component={OngoingShift} />
      <Stack.Screen
        name="CreateIncidentReport"
        component={CreateIncidentReport}
      />
      <Stack.Screen name="CreateFootReport" component={CreateFootPatrol} />
      <Stack.Screen name="AsapJobDetails" component={AsapJobDetails} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethodsScreen} />
      <Stack.Screen name="JobPayment" component={JobPaymentHistory} />
      <Stack.Screen name="Induction" component={StaffInduction} />
      <Stack.Screen name="StaffForms" component={StaffFormsScreen} />
      <Stack.Screen name="Policies" component={PoliciesScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Test" component={TestScreen} />
      <Stack.Screen name="StaffManagement" component={StaffManagement} />
      <Stack.Screen name="CoverJobs" component={CoverJobsScreen} />
      <Stack.Screen name="ContractorRates" component={ContractorRatesScreen} />
      <Stack.Screen
        name="DeleteProfileVerification"
        component={DeleteProfileVerification}
      />
      <Stack.Screen
        name="InductionQuestions"
        component={InductionQuestionsScreen}
        options={{ headerShown: false, gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
