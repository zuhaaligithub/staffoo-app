


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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getUserProfile, updateUserProfile } from '../services/authApi';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  X,
  Globe,
  Navigation,
  Edit2,
  ChevronDown,
} from 'lucide-react-native';
import { Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';

const GOOGLE_API_KEY = 'AIzaSyCS-DB39Kk-Z25C5GWymVGshXIALbjXPGY';

type Props = { navigation: any };

export default function ProfileSetupScreen({ navigation }: Props) {
  // ==================== ALL HOOKS MUST BE HERE (TOP) ====================
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);
  const addressInputRef = useRef<TextInput>(null);

  const [otp, setOtp] = useState<string>('');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Custom Dropdown States
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showResidentialModal, setShowResidentialModal] = useState(false);

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ];

  const residentialOptions = [
    { label: 'Student Visa', value: 'student_visa' },
    { label: 'Bridging Visa', value: 'bridging_visa' },
    { label: 'Citizen', value: 'citizen' },
    { label: 'Permanent Residence', value: 'permanent_residence' },
    { label: 'Visa Subclass 485', value: 'visa_485' },
  ];

  // useEffect must also be at top level
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

        const BASE_IMAGE_URL = 'https://apis.staffoo.com.au/storage/';
        if (profile?.staff?.profile_image) {
          setProfileImage(`${BASE_IMAGE_URL}${profile.staff.profile_image}`);
        } else if (profile?.customer?.profile_image) {
          setProfileImage(`${BASE_IMAGE_URL}${profile.customer.profile_image}`);
        } else if (profile?.contractor?.profile_image) {
          setProfileImage(`${BASE_IMAGE_URL}${profile.contractor.profile_image}`);
        }

        setUserType(profile?.user_type ?? null);
        setFullName(profile?.name ?? '');
        setGmail(profile?.email ?? '');
        setOriginalGmail(profile?.email ?? '');

        // 🔥 Get address from root OR nested objects (staff, customer, contractor)
        const currentAddress =
          profile?.address ||
          profile?.staff?.address ||
          profile?.customer?.address ||
          profile?.contractor?.address ||
          '';
        const currentCity =
          profile?.city ||
          profile?.staff?.city ||
          profile?.customer?.city ||
          profile?.contractor?.city ||
          '';
        const currentState =
          profile?.state ||
          profile?.staff?.state ||
          profile?.customer?.state ||
          profile?.contractor?.state ||
          '';
        const currentCountry =
          profile?.country ||
          profile?.staff?.country ||
          profile?.customer?.country ||
          profile?.contractor?.country ||
          '';

        setAddress(currentAddress);
        setCity(currentCity);
        setStateValue(currentState);
        setCountry(currentCountry);

        const currentCoordinates =
          profile?.coordinates ||
          profile?.staff?.coordinates ||
          profile?.customer?.coordinates ||
          profile?.contractor?.coordinates ||
          '';

        if (currentCoordinates) {
          const parts = currentCoordinates.split(',');

          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);

            if (!isNaN(lat) && !isNaN(lng)) {
              setCoordinates({ lat, lng });
            }
          }
        }

        if (profile?.user_type === 'contractor') {
          setPhoneNumber(profile?.contractor?.phone ?? '');
          setCompanyName(profile?.contractor?.company_name ?? '');
          setRegistrationNumber(profile?.contractor?.registration_number ?? '');
        } else if (profile?.user_type === 'staff') {
          setPhoneNumber(profile?.staff?.phone ?? '');
          setGender(profile?.staff?.gender ?? null);
          setResidentialStatus(profile?.staff?.staff_document_type ?? null);
        } else {
          setPhoneNumber(profile?.customer?.phone ?? '');
          setGender(profile?.customer?.gender ?? null);
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Could not load profile' });
      } finally {
        setFetching(false);
      }
    };

    initializeProfile();
  }, [navigation])

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
    } catch (err) {
      console.log('Places API error:', err);
    }
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
    } catch (err) {
      console.log('Place details error:', err);
    }
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Full Name is required' });
      return false;
    }
    if (!gmail.trim()) {
      Toast.show({ type: 'error', text1: 'Email is required' });
      return false;
    }
    if (!address.trim()) {
      Toast.show({ type: 'error', text1: 'Address is required' });
      return false;
    }

    if (userType === 'contractor') {
      if (!companyName.trim()) {
        Toast.show({ type: 'error', text1: 'Company Name is required' });
        return false;
      }
      if (!registrationNumber.trim()) {
        Toast.show({ type: 'error', text1: 'Registration Number is required' });
        return false;
      }
    } else if (userType === 'staff') {
      if (!gender) {
        Toast.show({ type: 'error', text1: 'Gender is required' });
        return false;
      }
      if (!residentialStatus) {
        Toast.show({ type: 'error', text1: 'Residential Status is required' });
        return false;
      }
    }
    return true;
  };



  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.5, // reduce quality
    });

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];

      // Resize image to reduce size
      const resizedImage = await ImageResizer.createResizedImage(
        asset.uri!,
        800, // maxWidth
        800, // maxHeight
        'JPEG',
        70   // compression 0-100
      );

      const file = {
        uri: resizedImage.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `profile_${Date.now()}.jpg`,
      };

      setProfileImage(file.uri); // for preview
      setImageFile(file);         // for API
    }
  };
  const handleContinue = async () => {
    if (!validateForm() || !userId) return;

    const emailChanged = gmail.trim().toLowerCase() !== originalGmail.trim().toLowerCase();

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        name: fullName.trim(),
        phone: phoneNumber.trim(),
        email: gmail.trim().toLowerCase(),
        // Keep address at root level (most common)
        address: address.trim(),
        city: city.trim(),
        state: stateValue.trim(),
        country: country.trim(),
        coordinates: coordinates ? `${coordinates.lat},${coordinates.lng}` : '',
      };

      if (imageFile) {
        payload.profile_image = imageFile;
      }

      // Add user-type specific fields
      if (userType === 'contractor') {
        payload.company_name = companyName.trim();
        payload.registration_number = registrationNumber.trim();
      }
      else if (userType === 'staff') {
        payload.gender = gender;
        payload.staff_document_type = residentialStatus;

        // Sometimes backend expects address inside staff object
        // Uncomment below if root level address is ignored
        // payload.staff = {
        //   address: address.trim(),
        //   city: city.trim(),
        //   state: stateValue.trim(),
        //   country: country.trim(),
        // };
      }
      else if (userType === 'customer') {
        // Same for customer if needed
        // payload.customer = { address: address.trim(), ... };
      }

      await updateUserProfile(userId, payload);

      if (emailChanged && userType === 'customer') {
        setOtpModalVisible(true);
        setLoading(false);
        return;
      }

      Toast.show({ type: 'success', text1: 'Profile Updated Successfully' });
      setOriginalGmail(gmail.trim().toLowerCase());
      navigation.navigate('Profile');

    } catch (err: any) {
      console.log('Update Error:', err?.response?.data || err);

      const errorMsg = err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to update profile';

      Toast.show({ type: 'error', text1: errorMsg, position: 'bottom' });
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
      const errorMsg = err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to verify OTP';

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

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2EB1E2" style={{ marginTop: 100 }} />
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
        <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <User size={30} color="#999" />
              <Text style={{ fontSize: 12 }}>Upload Photo</Text>
            </View>
          )}

          {/* ✅ Edit Icon */}
          <View style={styles.editIcon}>
            <Edit2 size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        {/* Full Name */}
        <InputField
          icon={User}
          label="Full Name"
          value={fullName}
          onChange={setFullName}
          placeholder="Enter your full name"
        />

        {/* Phone Number */}
        <InputField
          icon={Phone}
          label="Phone Number"
          value={phoneNumber}
          onChange={setPhoneNumber}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={gmail}
              onChangeText={setGmail}
              placeholder="yourname@gmail.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}

            />
          </View>
        </View>

        {/* Contractor Fields */}
        {userType === 'contractor' && (
          <>
            <InputField
              icon={Building2}
              label="Company Name"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Enter company name"
            />
            <InputField
              icon={FileText}
              label="Registration Number"
              value={registrationNumber}
              onChange={setRegistrationNumber}
              placeholder="Enter registration number"
            />
          </>
        )}

        {/* Staff Fields */}
        {userType === 'staff' && (
          <>
            <TouchableOpacity 
              style={styles.field} 
              onPress={() => setShowGenderModal(true)}
            >
              <Text style={styles.label}>Gender</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#666" style={styles.inputIcon} />
                <Text style={[styles.input, !gender && { color: '#9CA3AF' }]}>
                  {gender ? genderOptions.find(o => o.value === gender)?.label : 'Select Gender'}
                </Text>
                <ChevronDown size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.field} 
              onPress={() => setShowResidentialModal(true)}
            >
              <Text style={styles.label}>Residential Status</Text>
              <View style={styles.inputContainer}>
                <Globe size={20} color="#666" style={styles.inputIcon} />
                <Text style={[styles.input, !residentialStatus && { color: '#9CA3AF' }]}>
                  {residentialStatus 
                    ? residentialOptions.find(o => o.value === residentialStatus)?.label 
                    : 'Select Residential Status'}
                </Text>
                <ChevronDown size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </>
        )}

        <Modal visible={showGenderModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.customModal}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <FlatList
                data={genderOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setGender(item.value);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowGenderModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Residential Status Selection Modal */}
        <Modal visible={showResidentialModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.customModal}>
              <Text style={styles.modalTitle}>Select Residential Status</Text>
              <FlatList
                data={residentialOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setResidentialStatus(item.value);
                      setShowResidentialModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowResidentialModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Address */}
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

        {/* City */}
        <InputField
          icon={Building2}
          label="City"
          value={city}
          onChange={() => { }}
          editable={false}
          placeholder="City will appear here"
        />

        {/* State */}
        <InputField
          icon={Globe}
          label="State"
          value={stateValue}
          onChange={() => { }}
          editable={false}
          placeholder="State will appear here"
        />

        {/* Country */}
        <InputField
          icon={Globe}
          label="Country"
          value={country}
          onChange={() => { }}
          editable={false}
          placeholder="Country will appear here"
        />

        {/* Coordinates */}
        <InputField
          icon={Navigation}
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

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Google Places Suggestions */}
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

// Reusable InputField Component with Dynamic Icon
const InputField = ({
  icon: Icon,
  label,
  value,
  onChange,
  editable = true,
  placeholder = '',
  keyboardType = 'default',
}: any) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, !editable && styles.disabledInput]}>
      <Icon size={20} color="#666" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
      />
    </View>
  </View>
);

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
  // imageContainer: {
  //   alignItems: 'center',
  //   marginBottom: 5,
  // },

  // profileImage: {
  //   width: 100,
  //   height: 100,
  //   borderRadius: 50,
  //   borderWidth: 1,
  //   borderColor: '#e2e8f0',
  //    shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.08,
  //   shadowRadius: 4,
  //   elevation: 3,

  // },

  // placeholderImage: {
  //   width: 100,
  //   height: 100,
  //   borderRadius: 50,
  //   backgroundColor: '#f1f5f9',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },

  imageContainer: {
    alignSelf: 'center',
    marginBottom: 5,
    position: 'relative', // IMPORTANT
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  placeholderImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',

  },

  editIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#2EB1E2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
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
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    opacity: 0.85,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  picker: {
    height: 52,
    color: '#1e293b',
    fontSize: 15,
  },
  continueButton: {
    backgroundColor: '#2EB1E2',
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

  // Suggestions
  suggestionsList: {
    position: 'absolute',
    top: 380,
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



  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModal: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1e293b',
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1e293b',
  },
  cancelBtn: {
    marginTop: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  cancelText: {
    color: '#475569',
    fontWeight: '600',
  },

  // OTP Modal Styles
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
    backgroundColor: '#2EB1E2',
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