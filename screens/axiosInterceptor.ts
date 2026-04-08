// axiosInterceptor.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

let navigationRef: any = null;

// Set navigation reference from AppNavigator
export const setNavigationRef = (ref: any) => {
  navigationRef = ref;
};

const handleAuthError = async () => {
  try {
    await AsyncStorage.multiRemove(['@auth_token', '@user_id', 'user']);
    console.log('[Auth] Token cleared due to auth error');

    if (navigationRef) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    }
  } catch (err) {
    console.error('[Auth] Failed to clear storage on auth error', err);
  }
};

// Add Axios Interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      console.warn(`[Auth Error] ${status} - Redirecting to Login`);
      await handleAuthError();
    }

    return Promise.reject(error);
  }
);

export default axios;