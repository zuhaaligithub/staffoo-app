import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { ChargeRate, ChargeRateFormData } from '../navigation/types';

// const BASE_URL = 'https://apis.staffoo.com.au/api';
const BASE_URL = 'https://apis.staffoo.com.au/api';

export interface UserData {
  id: number | string;
  token: string;
  name: string;
  email: string;
  user_type: 'staff' | 'contractor';
  phone?: string;
  // Add more fields if your profile returns them
}

export interface LoginPayload {
  email: string;
  password: string;
}
export interface ProfileUpdatePayload {
  name?: string;
  phone?: string;
  gmail?: string;           // ← if you use this field for something else
  gender?: string;
  staff_document_type?: string;

  // Added for email change + OTP verification
  email?: string;
  email_otp?: string;

}


export const getAuthToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem('@auth_token');
};


export interface UserData {
  id: number | string;
  token: string;
  name: string;
  email: string;
  user_type: 'staff' | 'contractor';
  phone?: string;

}


export const saveAuthToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem('@auth_token', token);
};

const saveUser = async (user: UserData): Promise<void> => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};



export const loginUser = async (payload: LoginPayload): Promise<UserData> => {
  const endpoint = `${BASE_URL}/login`;

  console.log('[LOGIN REQUEST]', payload);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    console.log('[LOGIN RESPONSE]', data);

    if (!res.ok) {
      throw new Error(
        data?.message ||
        data?.error ||
        `Login failed — HTTP ${res.status}`
      );
    }

    if (!data?.token || !data?.user?.data?.id) {
      throw new Error('Invalid login response format');
    }

    const userInfo = data.user.data;

    const userData: UserData = {
      id: userInfo.id,
      token: data.token,
      name: userInfo.name || '',
      email: userInfo.email || '',
      user_type: userInfo.user_type,
      phone: userInfo.staff?.phone,
    };

    await saveAuthToken(data.token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));

    console.log('[LOGIN SUCCESS]');

    return userData;

  } catch (error: any) {
    console.error('[LOGIN ERROR]', error.message);

    if (error.message === 'Network request failed') {
      throw new Error(
        'Cannot reach the server. Check your internet connection or server URL.'
      );
    }

    throw error;
  }
};




export const getUserProfile = async (userId: string | number) => {
  try {
    console.log('🔹 getUserProfile called with ID:', userId);

    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }


    const endpoint = `${BASE_URL}/user-edit/${userId}`;

    console.log('🔹 Calling endpoint:', endpoint);

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    console.log('✅ Profile API Response:', response.data);

    return response.data;
  } catch (error: any) {
    console.log('❌ getUserProfile error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      throw new Error('Session expired. Please login again.');
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || 'Failed to fetch profile');
  }
};

export const updateUserProfile = async (
  userId: string | number,
  payload: ProfileUpdatePayload
) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const endpoint = `${BASE_URL}/user-update/${userId}`;

  console.log('[UPDATE PROFILE] →', endpoint);
  console.log('[UPDATE PROFILE] Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000, // optional: prevent hanging forever
    });

    console.log('[UPDATE PROFILE] ← success', response.data);

    // Update local storage with changed fields
    const current = await AsyncStorage.getItem('user');
    if (current) {
      const user = JSON.parse(current);

      const updatedUser = {
        ...user,
        name: payload.name ?? user.name,
        phone: payload.phone ?? user.phone,
        email: payload.email ?? user.email,           // ← now also update email
        // gmail: payload.gmail ?? user.gmail,        // if you use gmail field
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }

    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      'Failed to update profile';

    console.error('[UPDATE PROFILE ERROR]', {
      message: errorMessage,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    // Optional: show more user-friendly messages for common cases
    if (error?.response?.status === 400 && error?.response?.data?.message?.includes('OTP')) {
      throw new Error('Invalid or expired OTP. Please try again.');
    }

    if (error?.response?.status === 422) {
      throw new Error('Validation failed. Please check the entered details.');
    }

    throw new Error(errorMessage);
  }
};
export const uploadFile = async (file: any) => {
  try {
    const token = await AsyncStorage.getItem('@auth_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();

    formData.append('file', {
      uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
      name: file.name || file.fileName || `file_${Date.now()}.${file.type?.split('/')[1] || 'pdf'}`,
      type: file.type || file.mimeType || 'application/octet-stream',
    } as any);

    formData.append('folder', 'staff_documents');

    console.log('[UPLOAD PAYLOAD - EXACT FIELDS SENT]:', {
      file: {
        name: file.name || file.fileName || 'auto-generated',
        type: file.type || 'unknown',
        uriPreview: file.uri.substring(0, 60) + '...',
      },
      folder: 'staff_documents',
    });

    const response = await axios.post(`${BASE_URL}/upload-file`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 90000,
    });

    console.log('[UPLOAD SUCCESS]', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[UPLOAD ERROR]', {
      message: error.message,
      status: error.response?.status,
      backendResponse: error.response?.data,
    });

    const errMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      'Failed to upload file';

    throw new Error(errMsg);
  }
};



export type UserType = 'customer' | 'contractor' | 'staff';

export interface RegisterPayload {
  user_type: UserType;

  name: string;
  email: string;
  password: string;
  password_confirmation: string;

  // Common
  phone?: string;

  // Customer
  company_name?: string;
  address?: string;
  city?: string;
  country?: string;

  // Contractor
  registration_number?: string;

  // Staff
  employee_code?: string;
  designation?: string;
  joining_date?: string;
  salary?: number;
}

export interface RegisterResponse {
  token: string;
  user: {
    data: {
      id: number | string;
      name: string;
      email: string;
      user_type: 'staff' | 'contractor';
      staff?: {
        phone?: string;
      };
    };
  };
  message?: string;
}

export const registerUser = async (
  payload: RegisterPayload
): Promise<UserData> => {
  if (!payload.user_type) {
    throw new Error('user_type is required');
  }

  const endpoint = `${BASE_URL}/register/${payload.user_type}`;

  console.log('[REGISTER] →', endpoint, payload);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log('[REGISTER RESPONSE]', data);

    if (!res.ok) {
      if (res.status === 422 && data?.errors) {
        const firstError = Object.values(data.errors)[0];
        throw new Error(
          Array.isArray(firstError)
            ? String(firstError[0])
            : 'Validation failed'
        );
      }

      throw new Error(
        data?.message || `Registration failed — HTTP ${res.status}`
      );
    }

    const receivedToken = data?.token;
    const userInfo = data?.data?.user || data?.user || {};
    const extraInfo =
      data?.data?.staff ||
      data?.data?.contractor ||
      data?.data?.customer ||
      {};

    if (!receivedToken || !userInfo?.id) {
      console.log('[REGISTER STRUCTURE ERROR]', data);
      throw new Error('Invalid registration response format');
    }

    const userData: UserData = {
      id: userInfo.id,
      token: receivedToken,
      name: userInfo.name || payload.name,
      email: userInfo.email || payload.email,
      user_type: userInfo.user_type || payload.user_type,
      phone:
        extraInfo.phone ||
        userInfo.phone ||
        payload.phone ||
        '',
    };

    await saveAuthToken(receivedToken);
    await AsyncStorage.setItem('user', JSON.stringify(userData));

    console.log('[REGISTER SUCCESS]', userData);

    return userData;
  } catch (error: any) {
    console.error('[REGISTER ERROR]', error?.message || error);
    throw error;
  }




};


export interface PayRate {
  id?: number;
  name: string;
  rate: number;
  description?: string;
}




export const createChargeRate = async (payload: ChargeRateFormData): Promise<ChargeRate> => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const res = await axios.post(`${BASE_URL}/charge_rate/store`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return res.data; // assuming the API returns the created ChargeRate object
};

export const updateChargeRate = async (
  id: number,
  payload: ChargeRateFormData
): Promise<ChargeRate> => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const res = await axios.post(`${BASE_URL}/charge_rate/update`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return res.data;
};

interface ChargeRateResponse {
  success: boolean;
  data: ChargeRate[];
}

export const getAllChargeRates = async (): Promise<ChargeRateResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const res = await axios.get(`${BASE_URL}/get-all-chargerates`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  return res.data;   // { success: true, data: [...] }
};
// ... other functions ...

export const removeChargeRate = async (payload: { chargerate_id: number }) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/charge_rate/remove`;
  const res = await axios.post(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return res.data;
};
// ------------------- PAY RATE -------------------

export const createPayRate = async (payload: PayRate) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/payrate/store`;
  const res = await axios.post(endpoint, payload, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.data;
};

export const updatePayRate = async (id: number, payload: PayRate) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/payrate/update`;
  const res = await axios.post(endpoint, payload, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.data;
};

export const getAllPayRates = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/get-all-payrates`;
  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.data;
};

export const getPayRate = async (id: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/get-payrate/${id}`;
  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.data;
};

export const getAllArchivedPayRates = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/get-all-archive-payrates`;
  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return res.data;
};



export const removePayRate = async (payload: { payrate_id: number }) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/payrate/remove`;
  const res = await axios.post(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return res.data;
};


export interface JobPostPayload {
  user_id: number | string;
  title: string;
  description: string;
  address: string;
  coordinates: string;
  state: string;
  numberOfGuards: number;
  startTime: string;
  endTime: string;
  is_document: boolean;
  document_list: string[];
  document_types: string[];
  job_instruction?: string;

}

export interface JobPostResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: number | string;

  };

}


export const postJob = async (payload: JobPostPayload): Promise<JobPostResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const endpoint = `${BASE_URL}/job-post`;

  console.log('[JOB POST REQUEST] →', endpoint);
  console.log('[PAYLOAD SENT]', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post<JobPostResponse>(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });

    console.log('[JOB POST RESPONSE]', response.status, response.data);
    return response.data;
  } catch (error: any) {
    console.error('[JOB POST ERROR]', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    const errMessage = error?.response?.data?.message || error.message || 'Failed to create job';
    throw new Error(errMessage);
  }
};
// get-all-jobs
export const getAllJobs = async (): Promise<ChargeRateResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const res = await axios.get(`${BASE_URL}/get-all-jobs`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  return res.data;
};


export const getContractorStaff = async (userId: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const res = await axios.get(`${BASE_URL}/get-contractor-staff/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  return res.data;
};


// Helper to get logged-in user data (including guard_id / user id)
export const getCurrentUser = async () => {
  const userJson = await AsyncStorage.getItem('user');
  if (!userJson) return null;
  return JSON.parse(userJson);
};


export const postGuardJobs = async (
  type: 'confirmed',
  duration: 'today' | 'week',
  extraPayload: Record<string, any> = {} // optional extra fields
) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error('User ID not found. Please login again.');
    }

    const guard_id = user.id; // this is the guard_id (logged-in user's ID)

    const endpoint = `${BASE_URL}/guard/jobs/${type}/${duration}`;

    const payload = {
      guard_id,           // ← this is what you asked for
      ...extraPayload,    // any other fields you want to send
    };

    console.log('[POST Guard Jobs] URL:', endpoint);
    console.log('[POST Guard Jobs] Payload:', payload);

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('[POST Guard Jobs] Success:', response.data);

    return response.data;
  } catch (error: any) {
    console.error('[POST Guard Jobs] Error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      // Token expired or invalid → logout
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('user');
      throw new Error('Session expired. Please login again.');
    }

    throw new Error(
      error.response?.data?.message ||
      error.message ||
      'Failed to post guard jobs'
    );
  }
};





export const confirmJob = async (jobId: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error('No auth token');

  const response = await axios.post(
    `${BASE_URL}job/confirm/${jobId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  return response.data;
};
// ── types.ts or same api file ──
export interface SignInPayload {

  time: string;           // e.g. "02-03-2026 09:56"
  location: string;       // "31.4719948,74.3774692"
  selfie: string;         // base64 string with data:image/jpeg;base64, prefix
  notes: string;
  signin_time: string;    // usually same as time
  tasks_photos: string;   // empty string or "[]" or whatever backend expects
}

// ────────────────────────────────────────────────

export const signInShift = async (
  shiftId: string | number,
  payload: SignInPayload
): Promise<any> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }

  const endpoint = `${BASE_URL}/signin/${shiftId}`;

  console.log("[SIGN-IN REQUEST] →", endpoint, payload);

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 45000, // 45 seconds – selfies can be slow to upload
    });

    console.log("[SIGN-IN RESPONSE]", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "[SIGN-IN ERROR]",
      error.response?.data || error.message || error
    );

    if (error.response?.status === 401) {
      throw new Error("Session expired. Please login again.");
    }

    const msg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Failed to sign in shift";

    throw new Error(msg);
  }
};

// get-chargerates


export const getChargeRate = async (): Promise<ChargeRateResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  const res = await axios.get(`${BASE_URL}/get-chargerates`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  return res.data;
};