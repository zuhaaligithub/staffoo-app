// src/navigation/types.ts

import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ── Auth Stack ──────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type User = {
  id: number;
  name: string;
  email?: string;
  user_type?: string;
};

export type LoginResponse = {
  success: boolean;
  token: string;
  user: User;
};

// ── Main App Screens (Root / Drawer / Tabs) ─────────────────────
export type RootStackParamList = {
  // Auth (optional nested)
  // Auth: NavigatorScreenParams<AuthStackParamList>;

  Onboarding: undefined;
  Filter: undefined;
  ProfileSetup: undefined;
  Notifications: undefined;

  JobDetails: { jobId?: string };
  AllJobs: undefined;
  Applications: undefined;
  ViewApplications: undefined;
  Messages: undefined;
  MessageDetail: {
    chatId?: string;
    name?: string;
    avatar?: string;
  };
  Profile: undefined;
  ApplyJob: undefined;
  Documents: undefined;

  Accounts: undefined;
  ChargeRates: undefined;
  PayRates: undefined;

  // Create Job Flow
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
      // uploadedFilesCount  ← REMOVED (was causing the error)
      // It should NOT be inside jobData
    };
    uploadedFileUrls?: string[];           // ← add this
  uploadedFileNames?: string[];          // optional
  selectedDocuments?: string[];    // ← for the array of uploaded file paths
  };

  Main: undefined; // your drawer / tabs root
};

// ── Charge Rate types (unchanged, kept as-is)
// ──────────────────────────────────────────────

export interface ChargeRate {
  id?: number;
  title: string;
  customer_name: string;
  position: string;
  level: string;
  state: string;

  def_metro_mon_to_fri_day_rate: number;
  def_metro_mon_to_fri_night_rate: number;
  def_metro_sat_day_rate: number;
  def_metro_sun_day_rate: number;
  def_metro_pub_holi_day_rate: number;

  def_reg_mon_to_fri_day_rate: number;
  def_reg_mon_to_fri_night_rate: number;
  def_reg_sat_day_rate: number;
  def_reg_sun_day_rate: number;
  def_reg_pub_holi_day_rate: number;

  award_metro_mon_to_fri_day_rate: number;
  award_metro_mon_to_fri_night_rate: number;
  award_metro_sat_day_rate: number;
  award_metro_sun_day_rate: number;
  award_metro_pub_holi_day_rate: number;

  award_reg_mon_to_fri_day_rate: number;
  award_reg_mon_to_fri_night_rate: number;
  award_reg_sat_day_rate: number;
  award_reg_sun_day_rate: number;
  award_reg_pub_holi_day_rate: number;

  admin_id?: number;
  created_at?: string;
  updated_at?: string;
}

export type ChargeRateFormData = Omit<ChargeRate, 'id'>;

export type RootParamList = {
  Home: undefined;
  Applications: undefined;
  Messages: undefined;
  Profile: undefined;
  CreateJob: undefined;
};

const Stack = createNativeStackNavigator<RootParamList>();

