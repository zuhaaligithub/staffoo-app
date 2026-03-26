

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getUserProfile, updateUserProfile } from '../services/authApi';
import { Picker } from '@react-native-picker/picker';
import { ArrowLeft, Mail, MapPin, X } from 'lucide-react-native';

const GOOGLE_API_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';
const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = { navigation: any };

export default function ProfileSetupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gmail, setGmail] = useState('');
  const [originalGmail, setOriginalGmail] = useState(''); 
  const [gender, setGender] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [residentialStatus, setResidentialStatus] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [country, setCountry] = useState('');
  const [coordinates, setCoordinates] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userId, setUserId] = useState<number | string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const addressInputRef = useRef<TextInput>(null);
  const [otp, setOtp] = useState<string>('');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);


  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const storedUserRaw = await AsyncStorage.getItem('user');
        if (!storedUserRaw) {
          navigation.replace('Login');
          return;
        }

        const parsedUser = JSON.parse(storedUserRaw);
        const uid = parsedUser?.id;
        setUserId(uid);

        const profileResponse = await getUserProfile(uid);
        const profile = profileResponse?.data || {};

        setUserType(profile?.user_type ?? null);
        setFullName(profile?.name ?? '');
        setGmail(profile?.email ?? '');
        setOriginalGmail(profile?.email ?? ''); 

        setAddress(profile?.address ?? '');
        setCity(profile?.city ?? '');
        setStateValue(profile?.state ?? '');
        setCountry(profile?.country ?? '');
        if (profile?.coordinates) {
          const parts = profile.coordinates.split(',');
          if (parts.length === 2) {
            setCoordinates({ lat: parts[0], lng: parts[1] });
          }
        }

        if (profile?.user_type === 'contractor') {
          setPhoneNumber(profile?.contractor?.phone ?? '');
          setCompanyName(profile?.contractor?.company_name ?? '');
          setRegistrationNumber(profile?.contractor?.registration_number ?? '');
        } else {
          setPhoneNumber(profile?.customer?.phone ?? '');
          setGender(profile?.staff?.gender ?? null);
          setResidentialStatus(profile?.staff?.staff_document_type ?? null);
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Could not load profile' });
      } finally {
        setFetching(false);
      }
    };

    initializeProfile();
  }, []);

  const fetchPlaces = async (text: string) => {
    setAddress(text);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${GOOGLE_API_KEY}`
      );
      const json = await res.json();
      setPredictions(json.predictions || []);
      setShowSuggestions(true);
    } catch { }
  };

  const fetchPlaceDetails = async (placeId: string, description: string) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
      );
      const json = await res.json();
      const details = json.result;

      setAddress(description);

      let tempCity = '';
      let tempState = '';
      let tempCountry = '';

      details.address_components?.forEach((comp: any) => {
        if (comp.types.includes('locality')) tempCity = comp.long_name;
        if (comp.types.includes('administrative_area_level_1')) tempState = comp.long_name;
        if (comp.types.includes('country')) tempCountry = comp.long_name;
      });

      setCity(tempCity);
      setStateValue(tempState);
      setCountry(tempCountry);

      if (details.geometry?.location) {
        setCoordinates({
          lat: details.geometry.location.lat,
          lng: details.geometry.location.lng,
        });
      }

      setShowSuggestions(false);
      Keyboard.dismiss();
    } catch { }
  };

  const validateForm = () => {
    if (!fullName.trim()) return Toast.show({ type: 'error', text1: 'Full Name is required' }), false;
    // if (!phoneNumber.trim()) return Toast.show({ type: 'error', text1: 'Phone Number is required' }), false;
    if (!gmail.trim()) return Toast.show({ type: 'error', text1: 'Email is required' }), false;
    if (!address.trim()) return Toast.show({ type: 'error', text1: 'Address is required' }), false;

    if (userType === 'contractor') {
      if (!companyName.trim()) return Toast.show({ type: 'error', text1: 'Company Name is required' }), false;
      if (!registrationNumber.trim()) return Toast.show({ type: 'error', text1: 'Registration Number is required' }), false;
    } else {
      if (!gender) return Toast.show({ type: 'error', text1: 'Gender is required' }), false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;
    if (!userId) return;

    const emailChanged =
      gmail.trim().toLowerCase() !== originalGmail.trim().toLowerCase();

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        name: fullName.trim(),
        phone: phoneNumber.trim(),
        email: gmail.trim().toLowerCase(),
        address,
        city,
        state: stateValue,
        country,
        coordinates: coordinates
          ? `${coordinates.lat},${coordinates.lng}`
          : '',
      };

      if (userType === 'contractor') {
        payload.company_name = companyName.trim();
        payload.registration_number = registrationNumber.trim();
      }
      else if (userType === 'staff') {
        payload.gender = gender;
        payload.staff_document_type = residentialStatus;
      }

 
      await updateUserProfile(userId, payload);

      if (emailChanged && userType === 'customer') {
        console.log('Customer email changed → show OTP modal');

        setOtpModalVisible(true);
        setLoading(false);
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Profile Updated Successfully',
      });

      setOriginalGmail(gmail.trim().toLowerCase());
      navigation.navigate('Profile');

    } catch (err: any) {

      console.log('API ERROR →', err?.response?.data);

      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong';

      Toast.show({
        type: 'error',
        text1: errorMsg,
        position: 'bottom',
        visibilityTime: 4000,
      });

    } finally {
      setLoading(false);
    }
  };
  const handleVerifyAndSave = async () => {
    if (otp.length !== 6) {
      Toast.show({ type: 'error', text1: 'Please enter 6-digit OTP' });
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const payload = {
        email: gmail.trim().toLowerCase(),
        email_otp: otp.trim(),           
       
      };

      await updateUserProfile(userId!, payload);

      Toast.show({
        type: 'success',
        text1: 'Email updated successfully!',
      });

      setOriginalGmail(gmail.trim().toLowerCase());

      setOtpModalVisible(false);
      setOtp('');



    } catch (err: any) {
      let errorMsg = err?.message || 'Failed to verify OTP';

      if (err?.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      }

      Toast.show({
        type: 'error',
        text1: errorMsg,
        position: 'bottom',
        visibilityTime: 5000,
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Debug modal visibility
  useEffect(() => {
    console.log('OTP modal visible changed →', otpModalVisible);
  }, [otpModalVisible]);

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2869FE" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <InputField
          icon="person-outline"
          label="Full Name"
          value={fullName}
          onChange={setFullName}
          placeholder="Enter your full name"
        />
        <InputField
          icon="call-outline"
          label="Phone Number"
          value={phoneNumber}
                 placeholderTextColor="#9CA3AF"
          onChange={setPhoneNumber}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />

        {/* Email field – now always editable, no pencil */}
        <View style={styles.field}>
          <Text style={styles.label}>Email (Gmail)</Text>
          <View style={styles.inputContainer}>
            <Mail size={16} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={gmail}
              onChangeText={setGmail}
              placeholder="yourname@gmail.com"
                     placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            // editable={true} ← default is true anyway
            />
          </View>
        </View>

        {userType === 'contractor' && (
          <>
            <InputField
              icon="business-outline"
              label="Company Name"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Enter company name"
            />
            <InputField
              icon="document-text-outline"
              label="Registration Number"
              value={registrationNumber}
              onChange={setRegistrationNumber}
              placeholder="Enter registration number"
            />
          </>
        )}

        {(userType === 'staff' || userType === 'customer') && (
          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={setGender}
                style={styles.picker}
                dropdownIconColor="#666"
              >
                <Picker.Item label="Select gender" value={null} />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
              </Picker>
            </View>
          </View>
        )}

        {userType === 'staff' && (
          <View style={styles.field}>
            <Text style={styles.label}>Residential Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={residentialStatus}
                onValueChange={setResidentialStatus}
                style={styles.picker}
                dropdownIconColor="#666"
              >
                <Picker.Item label="Select status" value={null} />
                <Picker.Item label="Student Visa" value="student_visa" />
                <Picker.Item label="Citizen" value="citizen" />
              </Picker>
            </View>
          </View>
        )}

       <View style={styles.field}>
  <Text style={styles.label}>Address</Text>
  <View style={styles.inputContainer}>
   <MapPin size={20} color="#666" style={styles.inputIcon} />
    
    <TextInput
      ref={addressInputRef}
      style={styles.input}
      value={address}
      placeholder="Start typing your address..."
             placeholderTextColor="#9CA3AF"
      onChangeText={fetchPlaces}
      autoCorrect={false}
    />

    {/* Cross button to clear address */}
    {address.length > 0 && (
      <TouchableOpacity
        onPress={() => {
          setAddress('');
          setPredictions([]);
          setShowSuggestions(false);
          addressInputRef.current?.focus();
        }}
        style={{ marginLeft: 8 }}
      >
        <X size={20} color="#999" />
      </TouchableOpacity>
    )}
  </View>
</View>

        <InputField
          icon="business"
          label="City"
          value={city}
          onChange={() => { }}
          editable={false}
          placeholder="City will appear here"
        />
        <InputField
          icon="map"
          label="State"
          value={stateValue}
          onChange={() => { }}
          editable={false}
          placeholder="State will appear here"
        />
        <InputField
          icon="flag"
          label="Country"
          value={country}
          onChange={() => { }}
          editable={false}
          placeholder="Country will appear here"
        />
        <InputField
          icon="navigate"
          label="Coordinates"
          value={
            coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number'
              ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
              : ''
          }
          onChange={() => { }}
          editable={false}
          placeholder="Coordinates will appear here"
        />

        {/* Main Continue Button (now also handles email change OTP) */}
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showSuggestions && predictions.length > 0 && (
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          style={styles.suggestionsList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => fetchPlaceDetails(item.place_id, item.description)}
            >
              <MapPin size={18} color="#666" style={{ marginRight: 8 }} />
              <Text style={styles.suggestionText}>{item.description}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* OTP Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContainer}>
            <Text style={styles.modalTitle}>Verify Email Change</Text>
            <Text style={styles.modalSubtitle}>
              Enter the OTP sent to <Text style={{ fontWeight: 'bold' }}>{gmail}</Text>
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
                     placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  setOtpModalVisible(false);
                  setOtp('');
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyModalBtn, isVerifyingOtp && styles.btnDisabled]}
                disabled={isVerifyingOtp || otp.length !== 6}
                onPress={handleVerifyAndSave}
              >
                {isVerifyingOtp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.verifyModalText}>Verify & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── InputField Component ──────────────────────────────────────────────────────
const InputField = ({
  icon,
  label,
  value,
  onChange,
  editable = true,
  placeholder = '',
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, !editable && styles.disabledInput]}>
      <MapPin size={16} color="#666" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
               placeholderTextColor="#9CA3AF"
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
inputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ffffff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  paddingHorizontal: 14,
  height: 50,

  // ── Box Shadow ──
  shadowColor: '#000',          // shadow color
  shadowOffset: { width: 0, height: 2 }, // offset for iOS
  shadowOpacity: 0.1,           // subtle shadow
  shadowRadius: 4,              // blur radius for iOS
  elevation: 3,                 // shadow for Android
},
  disabledInput: {
    backgroundColor: '#f1f5f9',
    opacity: 0.8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',

     shadowColor: '#000',          // shadow color
  shadowOffset: { width: 0, height: 2 }, // offset for iOS
  shadowOpacity: 0.1,           // subtle shadow
  shadowRadius: 4,              // blur radius for iOS
  elevation: 3,   
  },
  picker: {
    height: 50,
    color: '#1e293b',
    fontSize:12,
  },
  suggestionsList: {
    position: 'absolute',
    top: 300,
    left: 24,
    right: 24,
    maxHeight: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: {
    fontSize: 15,
    color: '#334155',
  },
  continueButton: {
    backgroundColor: '#2869FE',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── OTP Modal Styles ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpModalContainer: {
    width: '88%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 22,
  },
  otpInput: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    letterSpacing: 5,
  },
  modalButtonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  verifyModalBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#2869FE',
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyModalText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});