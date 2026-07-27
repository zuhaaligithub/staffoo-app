import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import { ChargeRate, ChargeRateFormData } from "../navigation/types";

export const BASE_URL = "https://apis.staffoo.com.au/api";
// export const BASE_URL = "https://apis-staging.staffoo.com.au/api";

export interface UserData {
  id: number | string;
  token: string;
  name: string;
  email: string;
  user_type: "staff" | "contractor";
  phone?: string;
  // Add more fields if your profile returns them
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const getAuthToken = async (): Promise<string | null> => {
  let token = await AsyncStorage.getItem("@auth_token");
  if (!token) token = await AsyncStorage.getItem("auth_token");
  if (!token) token = await AsyncStorage.getItem("@token");
  return token;
};

export interface UserData {
  id: number | string;
  token: string;
  name: string;
  email: string;
  user_type: "staff" | "contractor";
  phone?: string;
}

export const saveAuthToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem("@auth_token", token);
};

const saveUser = async (user: UserData): Promise<void> => {
  await AsyncStorage.setItem("user", JSON.stringify(user));
};

export const loginUser = async (payload: LoginPayload): Promise<UserData> => {
  const endpoint = `${BASE_URL}/login`;

  console.log("[LOGIN REQUEST]", payload);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    console.log("[LOGIN RESPONSE]", data);

    if (!res.ok) {
      throw new Error(
        data?.message || data?.error || `Login failed — HTTP ${res.status}`,
      );
    }

    if (!data?.token || !data?.user?.data?.id) {
      throw new Error("Invalid login response format");
    }

    const userInfo = data.user.data;

    const userData: UserData = {
      id: userInfo.id,
      token: data.token,
      name: userInfo.name || "",
      email: userInfo.email || "",
      user_type: userInfo.user_type,
      phone: userInfo.staff?.phone,
    };

    await saveAuthToken(data.token);
    await AsyncStorage.setItem("user", JSON.stringify(userData));

    console.log("[LOGIN SUCCESS]");

    return userData;
  } catch (error: any) {
    console.error("[LOGIN ERROR]", error.message);

    if (error.message === "Network request failed") {
      throw new Error(
        "Cannot reach the server. Check your internet connection or server URL.",
      );
    }

    throw error;
  }
};

export const updateCoordinates = async (
  userId: string | number,
  payload: any,
) => {
  const token = await AsyncStorage.getItem("@auth_token");

  const res = await axios.post(
    `${BASE_URL}/update-coordinates/${userId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return res.data;
};

export const getUserProfile = async (userId: string | number) => {
  try {
    console.log("🔹 getUserProfile called with ID:", userId);

    const token = await getAuthToken();

    if (!token) {
      const err: any = new Error("No authentication token");
      err.status = 401;
      throw err;
    }

    const endpoint = `${BASE_URL}/user-edit/${userId}`;
    console.log("🔹 Calling endpoint:", endpoint);

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("✅ Profile API Response:", response.data);

    return response.data;
  } catch (error: any) {
    console.log(
      "❌ getUserProfile error:",
      error?.response?.data || error.message,
    );

    // 🔥 Handle 401 properly
    if (error?.response?.status === 401) {
      const err: any = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }

    // 🔥 Handle API message
    if (error?.response?.data?.message) {
      const err: any = new Error(error.response.data.message);
      err.status = error.response.status;
      throw err;
    }

    // 🔥 Network / unknown error
    const err: any = new Error(error.message || "Failed to fetch profile");
    err.status = error?.response?.status || 500;
    throw err;
  }
};
export const getUserTransactions = async (userId: number) => {
  const token = await getAuthToken();

  if (!token) {
    throw new Error("No authentication token found");
  }

  const endpoint = `${BASE_URL}/user-transactions/${userId}`;

  console.log("🔹 Transactions API:", endpoint);

  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("✅ Transactions Response:", response.data);

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ Transactions error:",
      error.response?.data || error.message,
    );

    if (error.response?.status === 401) {
      throw new Error("Session expired. Please login again.");
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch transactions",
    );
  }
};
// ==================== UPDATED INTERFACE ====================
export interface ProfileUpdatePayload {
  name?: string;
  phone?: string;
  email?: string;
  email_otp?: string;
  gender?: string | null;
  staff_document_type?: string | null;
  security_license_no?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  origin_country?: string;
  coordinates?: string;
  company_name?: string;
  registration_number?: string;
  acn?: string;
  abn?: string;
}

// ==================== UPDATE USER PROFILE ====================
// NOTE: every optional field below is appended whenever it's *present*
// in the payload (`!== undefined`), not when it's *truthy*. The old
// `if (payload.acn)` style check silently dropped the field from the
// FormData whenever the value was an empty string "" — which is exactly
// what happens when a contractor leaves ACN/ABN blank and saves. Since
// the caller (ProfileSetupScreen) always sets these keys (even to ""),
// switching to `!== undefined` means:
//   - a value you typed is always sent
//   - an intentionally-cleared field is sent as "" (so the backend can
//     actually clear it, instead of silently keeping the old value)
export const updateUserProfile = async (
  userId: string | number,
  payload: ProfileUpdatePayload & { profile_image?: any },
) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/user-update/${userId}`;
  const formData = new FormData();

  // ==================== APPEND FIELDS ====================

  // Basic fields
  if (payload.name !== undefined) formData.append("name", payload.name);
  if (payload.phone !== undefined) formData.append("phone", payload.phone);
  if (payload.email !== undefined) formData.append("email", payload.email);
  if (payload.email_otp !== undefined)
    formData.append("email_otp", payload.email_otp);

  // Staff fields
  if (payload.gender !== undefined && payload.gender !== null) {
    formData.append("gender", payload.gender);
  }
  if (payload.security_license_no !== undefined) {
    formData.append("security_license_no", payload.security_license_no);
  }
  if (
    payload.staff_document_type !== undefined &&
    payload.staff_document_type !== null
  ) {
    formData.append("staff_document_type", payload.staff_document_type);
  }
  if (payload.date_of_birth !== undefined) {
    formData.append("date_of_birth", payload.date_of_birth);
  }
  if (payload.origin_country !== undefined) {
    formData.append("origin_country", payload.origin_country);
  }

  // Address
  if (payload.address !== undefined)
    formData.append("address", payload.address);
  if (payload.city !== undefined) formData.append("city", payload.city);
  if (payload.state !== undefined) formData.append("state", payload.state);
  if (payload.country !== undefined)
    formData.append("country", payload.country);
  if (payload.coordinates !== undefined)
    formData.append("coordinates", payload.coordinates);

  // Contractor — these three were the ones silently dropping when blank
  if (payload.company_name !== undefined)
    formData.append("company_name", payload.company_name);
  if (payload.registration_number !== undefined) {
    formData.append("registration_number", payload.registration_number);
  }
  if (payload.acn !== undefined) formData.append("acn", payload.acn);
  if (payload.abn !== undefined) formData.append("abn", payload.abn);

  // Profile Image
  if (payload.profile_image) {
    formData.append("profile_image", {
      uri: payload.profile_image.uri,
      name: payload.profile_image.name || `profile_${Date.now()}.jpg`,
      type: payload.profile_image.type || "image/jpeg",
    } as any);
  }

  // ==================== SAFE LOGGING ====================
  console.log("[UPDATE PROFILE] Sending to:", endpoint);
  console.log("[UPDATE PROFILE] Payload fields:");

  const loggable: Record<string, any> = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    gender: payload.gender,
    security_license_no: payload.security_license_no,
    staff_document_type: payload.staff_document_type,
    date_of_birth: payload.date_of_birth,
    origin_country: payload.origin_country,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    country: payload.country,
    coordinates: payload.coordinates,
    company_name: payload.company_name,
    registration_number: payload.registration_number,
    acn: payload.acn,
    abn: payload.abn,
    has_profile_image: !!payload.profile_image,
  };

  console.log(JSON.stringify(loggable, null, 2), "im here");

  try {
    const response = await axios.post(endpoint, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("[UPDATE PROFILE] ← Success:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "[UPDATE PROFILE] Full Error:",
      error?.response?.data || error,
    );
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to update profile";
    throw new Error(errorMsg);
  }
};

// export const updateUserProfile = async (
//   userId: string | number,
//   payload: ProfileUpdatePayload & { profile_image?: any },
// ) => {
//   const token = await getAuthToken();
//   if (!token) {
//     throw new Error("No authentication token found");
//   }

//   const endpoint = `${BASE_URL}/user-update/${userId}`;
//   const formData = new FormData();

//   // ==================== BASIC FIELDS ====================
//   if (payload.name) formData.append("name", payload.name);
//   if (payload.phone) formData.append("phone", payload.phone);
//   if (payload.email) formData.append("email", payload.email);
//   if (payload.email_otp) formData.append("email_otp", payload.email_otp);
//   if (payload.gender) formData.append("gender", payload.gender);
//   if (payload.staff_document_type)
//     formData.append("staff_document_type", payload.staff_document_type);

//   // ==================== SECURITY LICENSE (Staff) ====================
//   if (payload.security_license_no !== undefined) {
//     formData.append("security_license_no", payload.security_license_no);
//   }

//   // ==================== DATE OF BIRTH ====================
//   if (payload.date_of_birth) {
//     formData.append("date_of_birth", payload.date_of_birth);
//   }

//   // ==================== ADDRESS ====================
//   if (payload.address) formData.append("address", payload.address);
//   if (payload.city) formData.append("city", payload.city);
//   if (payload.state) formData.append("state", payload.state);
//   if (payload.country) formData.append("country", payload.country);
//   if (payload.origin_country)
//     formData.append("origin_country", payload.origin_country);
//   if (payload.coordinates) formData.append("coordinates", payload.coordinates);

//   // ==================== CONTRACTOR ====================
//   if (payload.company_name)
//     formData.append("company_name", payload.company_name);
//   if (payload.registration_number)
//     formData.append("registration_number", payload.registration_number);
//   if (payload.acn) formData.append("acn", payload.acn);
//   if (payload.abn) formData.append("abn", payload.abn);

//   // ==================== PROFILE IMAGE ====================
//   if (payload.profile_image) {
//     formData.append("profile_image", {
//       uri: payload.profile_image.uri,
//       name: payload.profile_image.name || "profile.jpg",
//       type: payload.profile_image.type || "image/jpeg",
//     } as any);
//   }

//   // ==================== LOGGING ====================
//   console.log("[UPDATE PROFILE] Sending to:", endpoint);
//   const logData: Record<string, any> = {
//     name: payload.name,
//     phone: payload.phone,
//     email: payload.email,
//     gender: payload.gender,
//     staff_document_type: payload.staff_document_type,
//     security_license_no: payload.security_license_no, // ← Added
//     date_of_birth: payload.date_of_birth,
//     company_name: payload.company_name,
//     registration_number: payload.registration_number,
//     acn: payload.acn,
//     abn: payload.abn,
//     address: payload.address,
//     city: payload.city,
//     state: payload.state,
//     country: payload.country,
//     origin_country: payload.origin_country,
//     coordinates: payload.coordinates,
//   };
//   console.log("[UPDATE PROFILE] FormData contents:", logData);

//   try {
//     const response = await axios.post(endpoint, formData, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "multipart/form-data",
//         Accept: "application/json",
//       },
//       timeout: 15000,
//     });

//     console.log("[UPDATE PROFILE] ← Success:", response.data);
//     return response.data;
//   } catch (error: any) {
//     console.error(
//       "[UPDATE PROFILE] Full Error:",
//       error?.response?.data || error,
//     );
//     const errorMessage =
//       error?.response?.data?.message ||
//       error?.response?.data?.error ||
//       error?.response?.data?.errors?.[0] ||
//       error.message ||
//       "Failed to update profile";
//     throw new Error(errorMessage);
//   }
// };

export const uploadFile = async (file: any) => {
  try {
    const token = await AsyncStorage.getItem("@auth_token");

    if (!token) {
      throw new Error("No authentication token found");
    }

    const formData = new FormData();
    const localUri: string = file.uri || file.path || "";
    const normalizedUri =
      localUri.startsWith("file://") || localUri.startsWith("content://")
        ? localUri
        : `file://${localUri}`;

    formData.append("file", {
      uri: normalizedUri,
      name:
        file.name ||
        file.fileName ||
        `file_${Date.now()}.${file.type?.split("/")[1] || "pdf"}`,
      type: file.type || file.mimeType || "application/octet-stream",
    } as any);

    formData.append("folder", "staff_documents");

    console.log("[UPLOAD PAYLOAD - EXACT FIELDS SENT]:", {
      file: {
        name: file.name || file.fileName || "auto-generated",
        type: file.type || "unknown",
        uriPreview: file.uri.substring(0, 60) + "...",
      },
      folder: "staff_documents",
    });

    const response = await axios.post(`${BASE_URL}/upload-file`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 90000,
    });

    console.log("[UPLOAD SUCCESS]", response.data);
    return response.data;
  } catch (error: any) {
    console.error("[UPLOAD ERROR]", {
      message: error.message,
      status: error.response?.status,
      backendResponse: error.response?.data,
    });

    const errMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "Failed to upload file";

    throw new Error(errMsg);
  }
};

export type UserType = "customer" | "contractor" | "staff";

export interface RegisterPayload {
  user_type: UserType;

  name: string;
  email: string;
  password: string;
  password_confirmation: string;

  // Common
  phone?: string;
}

export interface RegisterResponse {
  token: string;
  user: {
    data: {
      id: number | string;
      name: string;
      email: string;
      user_type: "staff" | "contractor";
      staff?: {
        phone?: string;
      };
    };
  };
  message?: string;
}

export const registerUser = async (
  payload: RegisterPayload,
): Promise<UserData> => {
  if (!payload.user_type) {
    throw new Error("user_type is required");
  }

  const endpoint = `${BASE_URL}/register/user`;

  console.log("[REGISTER] →", endpoint, payload);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("[REGISTER RESPONSE]", data);

    if (!res.ok) {
      if (res.status === 422 && data?.errors) {
        const firstError = Object.values(data.errors)[0];
        throw new Error(
          Array.isArray(firstError)
            ? String(firstError[0])
            : "Validation failed",
        );
      }

      throw new Error(
        data?.message || `Registration failed — HTTP ${res.status}`,
      );
    }

    const receivedToken = data?.token;
    const userInfo = data?.data?.user || data?.user || {};
    const extraInfo =
      data?.data?.staff || data?.data?.contractor || data?.data?.customer || {};

    if (!receivedToken || !userInfo?.id) {
      console.log("[REGISTER STRUCTURE ERROR]", data);
      throw new Error("Invalid registration response format");
    }

    const userData: UserData = {
      id: userInfo.id,
      token: receivedToken,
      name: userInfo.name || payload.name,
      email: userInfo.email || payload.email,
      user_type: userInfo.user_type || payload.user_type,
      phone: extraInfo.phone || userInfo.phone || payload.phone || "",
    };

    await saveAuthToken(receivedToken);
    await AsyncStorage.setItem("user", JSON.stringify(userData));

    console.log("[REGISTER SUCCESS]", userData);

    return userData;
  } catch (error: any) {
    console.error("[REGISTER ERROR]", error?.message || error);
    throw error;
  }
};

export interface PayRate {
  id?: number;
  name: string;
  rate: number;
  description?: string;
}

export const createChargeRate = async (
  payload: ChargeRateFormData,
): Promise<ChargeRate> => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const res = await axios.post(`${BASE_URL}/charge_rate/store`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return res.data; // assuming the API returns the created ChargeRate object
};

export const updateChargeRate = async (
  id: number,
  payload: ChargeRateFormData,
): Promise<ChargeRate> => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const res = await axios.post(`${BASE_URL}/charge_rate/update`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
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
  if (!token) throw new Error("No authentication token found");

  const res = await axios.get(`${BASE_URL}/get-all-chargerates`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  return res.data; // { success: true, data: [...] }
};
// ... other functions ...

export const removeChargeRate = async (payload: { chargerate_id: number }) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/charge_rate/remove`;
  const res = await axios.post(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return res.data;
};
// ------------------- PAY RATE -------------------

export const createPayRate = async (payload: PayRate) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/payrate/store`;
  const res = await axios.post(endpoint, payload, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return res.data;
};

export const updatePayRate = async (id: number, payload: PayRate) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/payrate/update`;
  const res = await axios.post(endpoint, payload, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return res.data;
};

export const getAllPayRates = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/get-all-payrates`;
  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return res.data;
};

export const getPayRate = async (id: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/get-payrate/${id}`;
  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return res.data;
};

export const getAllArchivedPayRates = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/get-all-archive-payrates`;
  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return res.data;
};

export const removePayRate = async (payload: { payrate_id: number }) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/payrate/remove`;
  const res = await axios.post(endpoint, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return res.data;
};

// export interface JobPostPayload {
//   user_id: number | string;
//   title: string;
//   description: string;
//   address: string;
//   coordinates: string;
//   state: string;
//   numberOfGuards: number;
//   startTime: string;
//   endTime: string;
//   shifts?: Array<{
//     start: string;
//     end: string;
//     numberOfGuards: number;
//   }>;
//   is_document: boolean;
//   document_list: string[];
//   document_types: string[];
//   job_instruction?: string;
//   payment_intent_id?: string | null;
//   payment_option?: 'full' | 'split';
// }

export interface JobShift {
  start: string;
  end: string;
  numberOfGuards: number;
}

export interface JobFinancials {
  base_total_inc_gst: number;
  discount_applied: number;
  amount_to_charge_today: number;
  balance_deferred: number;
}

export interface JobPostPayload {
  user_id: number;

  job_type: string;

  description: string;

  address: string;

  coordinates: string;

  state: string;

  shifts: JobShift[];

  payment_option: "full" | "split";

  job_location_state: string;

  financials: JobFinancials;

  is_document: boolean;

  document_list: string[];

  document_types: string[];

  job_instruction: string;

  tasks: any[];

  payment_intent_id: string | null;
}

export interface JobPostResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: number | string;
  };
}

export const postJob = async (
  payload: JobPostPayload,
): Promise<JobPostResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/job-post`;

  console.log("[JOB POST REQUEST] →", endpoint);
  console.log("[PAYLOAD SENT]", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post<JobPostResponse>(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    console.log("[JOB POST RESPONSE]", response.status, response.data);
    return response.data;
  } catch (error: any) {
    console.error("[JOB POST ERROR]", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    const errMessage =
      error?.response?.data?.message || error.message || "Failed to create job";
    throw new Error(errMessage);
  }
};

// Create a Payment Method via your backend which in turn calls Stripe (server-side)
export const createPaymentMethod = async (
  cardPayload: any,
): Promise<{ id: string }> => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  try {
    const res = await axios.post(`${BASE_URL}/payment_methods`, cardPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 20000,
    });

    // Expect backend to return { id: 'pm_...' } or similar
    if (!res.data || !res.data.id)
      throw new Error("Invalid response from create-payment-method");

    return { id: res.data.id };
  } catch (error: any) {
    console.error(
      "[CREATE PAYMENT METHOD ERROR]",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to create payment method",
    );
  }
};

// Call the Staffoo payment hold endpoint
export const holdPayment = async (holdPayload: Record<string, any>) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  try {
    const res = await axios.post(`${BASE_URL}/payment/hold`, holdPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 20000,
    });

    return res.data;
  } catch (error: any) {
    console.error(
      "[HOLD PAYMENT ERROR]",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to hold payment",
    );
  }
};
// get-all-jobs
export const getAllJobs = async (): Promise<ChargeRateResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const res = await axios.get(`${BASE_URL}/get-all-jobs`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  return res.data;
};

export const getContractorStaff = async (userId: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const res = await axios.get(
    `${BASE_URL}/get-contractor-active-staff/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  return res.data;
};

// Helper to get logged-in user data (including guard_id / user id)
export const getCurrentUser = async () => {
  const userJson = await AsyncStorage.getItem("user");
  if (!userJson) return null;
  return JSON.parse(userJson);
};

export const postGuardJobs = async (
  type: "confirmed",
  duration: "today" | "week",
  extraPayload: Record<string, any> = {}, // optional extra fields
) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("No authentication token found. Please login again.");
    }

    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("User ID not found. Please login again.");
    }

    const guard_id = user.id; // this is the guard_id (logged-in user's ID)

    const endpoint = `${BASE_URL}/guard/jobs/${type}/${duration}`;

    const payload = {
      guard_id, // ← this is what you asked for
      ...extraPayload, // any other fields you want to send
    };

    console.log("[POST Guard Jobs] URL:", endpoint);
    console.log("[POST Guard Jobs] Payload:", payload);

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    console.log("[POST Guard Jobs] Success:", response.data);

    return response.data;
  } catch (error: any) {
    console.error(
      "[POST Guard Jobs] Error:",
      error.response?.data || error.message,
    );

    if (error.response?.status === 401) {
      // Token expired or invalid → logout
      await AsyncStorage.removeItem("@auth_token");
      await AsyncStorage.removeItem("user");
      throw new Error("Session expired. Please login again.");
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to post guard jobs",
    );
  }
};

export const confirmJob = async (jobId: number) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await axios.post(
    `${BASE_URL}job/confirm/${jobId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  return response.data;
};
// ── types.ts or same api file ──
export interface SignInPayload {
  time: string; // e.g. "02-03-2026 09:56"
  location: string; // "31.4719948,74.3774692"
  selfie: string; // base64 string with data:image/jpeg;base64, prefix
  notes: string;
  signin_time: string; // usually same as time
  tasks_photos: string; // empty string or "[]" or whatever backend expects
}

// ────────────────────────────────────────────────

export const signInShift = async (
  shiftId: string | number,
  payload: SignInPayload,
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
      error.response?.data || error.message || error,
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

export const getContractor = async (params?: Record<string, any>) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found.");

  try {
    const response = await axios.get(`${BASE_URL}/admin/get-contractors`, {
      params: params || {},
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ getContractor (admin) error:",
      error.response?.data || error.message,
    );
    if (error.response?.status === 401)
      throw new Error("Session expired. Please login again.");
    if (error.response?.data?.message)
      throw new Error(error.response?.data?.message);
    throw new Error(error.message || "Failed to fetch contractors");
  }
};

export const postWithAuth = async (url: string, payload: any) => {
  const token = await AsyncStorage.getItem("@auth_token"); // your token key
  if (!token) throw new Error("No authentication token found.");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
};

export const getLeaveDetails = async (userId: string | number) => {
  try {
    console.log("🔹 getUserProfile called with ID:", userId);

    const token = await getAuthToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const endpoint = `${BASE_URL}/getLeaveDetails/${userId}`;

    console.log("🔹 Calling endpoint:", endpoint);

    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("✅ Profile API Response:", response.data);

    return response.data;
  } catch (error: any) {
    console.log(
      "❌ getUserProfile error:",
      error.response?.data || error.message,
    );

    if (error.response?.status === 401) {
      throw new Error("Session expired. Please login again.");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || "Failed to fetch profile");
  }
};

export const getChargeRate = async (): Promise<ChargeRateResponse> => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const res = await axios.get(`${BASE_URL}/get-chargerates`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  return res.data;
};

export const getCustomers = async (params?: Record<string, any>) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const endpoint = `${BASE_URL}/admin/get-customers`;

  try {
    const response = await axios.get(endpoint, {
      params: params || {},
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ getCustomers error:",
      error.response?.data || error.message,
    );

    if (error.response?.status === 401) {
      throw new Error("Session expired. Please login again.");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || "Failed to fetch customers");
  }
};

// In your authApi.ts file

export const getContractors = async (userId: string | number) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No authentication token found. Please login again.");
  }

  const endpoint = `${BASE_URL}/get-contractor-staff/${userId}`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`, // ← Token in Authorization header (correct)
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log("✅ getContractors success:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "❌ getContractors error:",
      error.response?.data || error.message,
    );

    if (error.response?.status === 401) {
      throw new Error("Session expired. Please login again.");
    }

    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Failed to fetch contractors";

    throw new Error(errorMsg);
  }
};

export const getStaff = async (params?: Record<string, any>) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  const endpoint = `${BASE_URL}/admin/get-staff`;

  try {
    const response = await axios.get(endpoint, {
      params: params || {},
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("❌ getStaff error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      throw new Error("Session expired. Please login again.");
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || "Failed to fetch staff");
  }
};

export const readAllMessages = async (id: number | string) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/messages/read-all/${id}`;

  try {
    const response = await axios.post(
      endpoint,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ readAllMessages error:",
      error.response?.data || error.message,
    );
    if (error.response?.status === 401)
      throw new Error("Session expired. Please login again.");
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to mark messages as read",
    );
  }
};

export const getConversation = async (id: number | string) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/messages/conversation/${id}`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ getConversation error:",
      error.response?.data || error.message,
    );
    if (error.response?.status === 401)
      throw new Error("Session expired. Please login again.");
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch conversation",
    );
  }
};

export const getConversations = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/messages/conversations`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ getConversations error:",
      error.response?.data || error.message,
    );
    if (error.response?.status === 401)
      throw new Error("Session expired. Please login again.");
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch conversations",
    );
  }
};

export const sendMessage = async (payload: {
  receiver_id: number | string;
  message: string;
}) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/messages/send`;

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ sendMessage error:",
      error.response?.data || error.message,
    );
    if (error.response?.status === 401)
      throw new Error("Session expired. Please login again.");
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to send message",
    );
  }
};

export const deleteMessage = async (id: number | string) => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const endpoint = `${BASE_URL}/messages/${id}`;

  try {
    const response = await axios.delete(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(
      "❌ deleteMessage error:",
      error.response?.data || error.message,
    );
    if (error.response?.status === 401)
      throw new Error("Session expired. Please login again.");
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to delete message",
    );
  }
};

export const logoutUser = async () => {
  try {
    const token = await AsyncStorage.getItem("@auth_token");
    const userId = await AsyncStorage.getItem("@user_id");

    if (!token || !userId) {
      throw new Error("Missing token or userId");
    }

    const response = await axios.post(
      `${BASE_URL}/logout/${userId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          user_id: userId, // ✅ ADD THIS
          // or 'user_id': userId  ← depends on backend
        },
      },
    );

    console.log("[LOGOUT SUCCESS]", response.data);

    return response.data;
  } catch (error: any) {
    console.error("[LOGOUT ERROR]", error.response?.data || error.message);

    throw new Error(error?.response?.data?.message || "Logout failed");
  }
};
